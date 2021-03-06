/**
 * (c) 2018 cepharum GmbH, Berlin, http://cepharum.de
 *
 * The MIT License (MIT)
 *
 * Copyright (c) 2018 cepharum GmbH
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 *
 * @author: cepharum
 */

"use strict";

const Path = require( "path" );
const File = require( "fs" );
const MIME = require( "./mime" );
const Download = require( "./download" );


module.exports = {
	blueprints( options ) {
		const api = this;
		const { projectFolder } = options;
		const { config: { static: configs = [] }, runtime: { services: Services } } = api;

		const logDebug = this.log( "hitchy:static:debug" );
		const logError = this.log( "hitchy:static:error" );

		const providers = new Map();

		if ( Array.isArray( configs ) ) {
			const numProviders = configs.length;

			for ( let i = 0; i < numProviders; i++ ) {
				const { prefix, folder, fallback, mime, download, filter, process } = configs[i];

				const absoluteFolder = Path.resolve( projectFolder, folder );
				if ( absoluteFolder.indexOf( projectFolder ) !== 0 ) {
					throw new TypeError( "static file providers may expose files in scope of your Hitchy project, only" );
				}

				const _mime = Object.assign( {}, MIME, mime );
				const _download = Object.assign( {}, Download, download );

				logDebug( "adding blueprint route exposing %s at %s with fallback %s", absoluteFolder, prefix, fallback );

				providers.set( ( prefix === "/" ? "" : prefix ) + "/:route*", createProvider( absoluteFolder, fallback, {
					prefix,
					mime: _mime,
					download: _download,
					filter,
					process,
				} ) );
			}
		}

		return providers;


		/**
		 * Creates file provider delivering files in client request.
		 *
		 * @param {string} folder path name of folder containing all files available for retrieval
		 * @param {string=} fallback relative pathname of file to deliver on request for missing file
		 * @param {string} prefix prefix for URL path of static file provider to create
		 * @param {object<string,string>} mime custom MIME mappings (mapping from filename extensions into MIME IDs)
		 * @param {object<string,boolean>} download custom mapping of MIME IDs into boolean marking if related file should be exposed for download
		 * @param {StaticFilterCallback} filter custom callback invoked for deciding whether deliver some requested file or not
		 * @param {StaticProcessCallback} process custom callback invoked for optionally redirecting provided stream for reading file's content
		 * @return {function(req:IncomingMessage, res:ServerResponse)} handler delivering files in folder on client requesting URL in scope of given prefix
		 */
		function createProvider( folder, fallback = null, {
			prefix, mime = {}, download = {},
			filter = null, process = null
		} ) {
			return function( req, res ) {
				const that = this;

				// check request method
				let isFetching = false;
				let isTesting = false;

				switch ( req.method ) {
					case "GET" :
						isFetching = true;
						break;

					case "HEAD" :
						isTesting = true;
						break;
				}

				if ( !isFetching && !isTesting ) {
					res.status( 400 ).send( "GET or HEAD method allowed, only" );
					return undefined;
				}


				const { route = [] } = req.params;


				/**
				 * Tries reading selected file implicitly sending its content in
				 * response to processed request.
				 *
				 * @param {string[]} segments segments or fragments of relative pathname addressing file in context of provided folder
				 * @param {boolean} actual set true if this time it's trying actually requested file (instead of fallback)
				 * @return {Promise<boolean>} promises true on having sent file, false on testing file succeeded, rejects with error w/ HTTP-like status code
				 */
				function tryFile( segments, actual ) {
					return new Promise( ( resolve, reject ) => {
						const pathName = Path.resolve( folder, ...segments );
						if ( pathName.indexOf( folder ) !== 0 ) {
							reject( new Services.HttpException( 400, "invalid path name beyond document root" ) );
							return;
						}

						const urlPath = Path.posix.join( ...segments );

						Promise.resolve( typeof filter === "function" ? filter.call( that, urlPath, pathName, actual ) : undefined )
							.then( () => {
								// request has passed filter
								logDebug( "trying %s", pathName );

								if ( isFetching ) {
									return Promise.resolve( File.createReadStream( pathName, {
										flags: "r",
									} ) )
										.then( stream => ( typeof process === "function" ? process.call( that, urlPath, pathName, stream ) : stream ) )
										.then( stream => {
											if ( stream ) {
												stream.on( "error", error => {
													switch ( error.code ) {
														case "ENOENT" :
															reject( Object.assign( error, { statusCode: 404 } ) );
															break;

														case "EISDIR" :
															reject( Object.assign( error, { statusCode: 301 } ) );
															break;

														default :
															reject( Object.assign( error, { statusCode: 500 } ) );
													}
												} );

												stream.once( "data", () => {
													const extensionMatch = /\.[^.]+$/.exec( pathName );
													const mimeType = ( extensionMatch && mime[extensionMatch[0].toLowerCase()] ) || "application/octet-stream";

													if ( download[mimeType] ) {
														res.set( "Content-Disposition", `attachment; filename=${Path.basename( pathName )}` );
													}

													res.status( 200 ).set( "Content-Type", mimeType );
												} );

												stream.once( "end", () => resolve( true ) );

												stream.pipe( res );
											}
										} );
								}

								// request is testing for file existing
								File.stat( pathName, ( error, stat ) => {
									if ( error ) {
										switch ( error.code ) {
											case "ENOENT" :
												reject( Object.assign( error, { statusCode: 404 } ) );
												break;

											default :
												reject( Object.assign( error, { statusCode: 500 } ) );
										}
									} else if ( stat.isDirectory() ) {
										reject( new Services.HttpException( 301, "is directory" ) );
									} else if ( stat.isFile() ) {
										const extensionMatch = /\.[^.]+$/.exec( pathName );
										const mimeType = ( extensionMatch && mime[extensionMatch[0].toLowerCase()] ) || "application/octet-stream";

										res.status( 200 )
											.set( "Content-Type", mimeType )
											.set( "Content-Length", stat.size )
											.set( "Last-Modified", new Date( stat.mtime ).toUTCString() )
											.end();

										resolve( false );
									} else {
										reject( Object.assign( error, { statusCode: 404 } ) );
									}
								} );

								return undefined;
							} )
							.catch( reject );
					} );
				}


				logDebug( "handling request for %s", route.join( "/" ) || "<root>" );

				return tryFile( route, true )
					.catch( error => {
						switch ( error.statusCode ) {
							case 301 : {
								const pathName = Path.resolve( folder, ...route );

								File.stat( Path.join( pathName, "index.html" ), ( statError, stat ) => {
									if ( statError || !stat || !stat.isFile() ) {
										res
											.status( 403 )
											.send( "access on folder list forbidden" );
									} else {
										res
											.status( 301 )
											.set( "Location", Path.posix.join( prefix, ...route, "index.html" ) )
											.send( "is directory, see index.html" );
									}
								} );

								return undefined;
							}

							case 404 :
								if ( fallback ) {
									return tryFile( [fallback], false );
								}

							// falls through
							default :
								throw error;
						}
					} )
					.catch( error => {
						res.status( error.statusCode || 500 );

						switch ( error.statusCode ) {
							case 404 :
								res.send( "no such file" );
								break;

							case 403 :
								res.send( "accessing file or folder forbidden" );
								break;

							case 500 :
							default :
								logError( "delivering static file failed: %s", error.statusCode ? error.message : error.stack );

								res.send( "error on processing request for fetching selected file" );
								break;
						}
					} );
			};
		}
	},
};


/**
 * @typedef {function(this:HitchyRequestContext, urlPath:string, filePath:string, requested:boolean):Promise<void>} StaticFilterCallback
 */

/**
 * @typedef {function(this:HitchyRequestContext, urlPath:string, filePath:string, data:ReadableStream):?ReadableStream} StaticProcessCallback
 */
