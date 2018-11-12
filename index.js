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


module.exports = {
	blueprints( options ) {
		const { projectFolder } = options;
		const { runtime: { config: { static: configs = [] } } } = this;

		const providers = new Map();

		if ( Array.isArray( configs ) ) {
			const numProviders = configs.length;

			for ( let i = 0; i < numProviders; i++ ) {
				const { prefix, folder } = configs[i];

				const absoluteFolder = Path.resolve( projectFolder, folder );
				if ( absoluteFolder.indexOf( projectFolder ) !== 0 ) {
					throw new TypeError( "static file providers may expose files in scope of your Hitchy project, only" );
				}

				providers.set( ( prefix === "/" ? "" : prefix ) + "/:route*", createProvider( absoluteFolder ) );
			}
		}

		return providers;
	},
};

/**
 * Creates file provider delivering files in client request.
 *
 * @param {string} folder path name of folder containing all files available for retrieval
 * @return {function(req:IncomingMessage, res:ServerResponse)} handler delivering files in folder on client requesting URL in scope of given prefix
 */
function createProvider( folder ) {
	return function( req, res ) {
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
			return;
		}


		// compile pathname of requested fule
		const { route } = req.params;

		const pathName = Path.resolve( folder, ...route || [] );
		if ( pathName.indexOf( folder ) !== 0 ) {
			res.status( 400 ).send( "invalid path name beyond document root" );
			return;
		}


		if ( isFetching ) {
			const stream = File.createReadStream( pathName, {
				flags: "r",
			} );

			stream.on( "error", error => {
				switch ( error.code ) {
					case "ENOENT" :
						res.status( 404 ).send( "no such file" );
						break;

					case "EISDIR" :
						checkFolder( pathName, res );
						break;

					default :
						res.status( 500 ).send( "error on accessing file" );
				}
			} );

			stream.once( "data", () => {
				const extensionMatch = /\..+$/.exec( pathName );
				const mime = ( extensionMatch && MIME[extensionMatch[0].toLowerCase()] ) || "application/octet-stream";

				res.status( 200 ).set( "Content-Type", mime );
			} );

			stream.pipe( res );
		} else {
			// request is testing for file existing
			File.stat( pathName, ( error, stat ) => {
				if ( error ) {
					switch ( error.code ) {
						case "ENOENT" :
							res.status( 404 ).send( "no such file" );
							break;

						default :
							res.status( 500 ).send( "error on accessing file" );
					}
				} else if ( stat.isDirectory() ) {
					checkFolder( pathName, res );
				} else if ( stat.isFile() ) {
					const extensionMatch = /\..+$/.exec( pathName );
					const mime = ( extensionMatch && MIME[extensionMatch[0].toLowerCase()] ) || "application/octet-stream";

					res.status( 200 )
						.set( "Content-Type", mime )
						.set( "Content-Length", stat.size )
						.set( "Last-Modified", new Date( stat.mtime ).toUTCString() )
						.end();
				} else {
					res.status( 404 ).send( "no such file" );
				}
			} );
		}
	};
}

/**
 * Responds to client requesting folder.
 *
 * @param {string} pathName path name of folder requested by client
 * @param {ServerResponse} res response descriptor
 * @returns {void}
 */
function checkFolder( pathName, res ) {
	File.stat( Path.join( pathName, "index.html" ), ( statError, stat ) => {
		if ( statError || !stat || !stat.isFile() ) {
			res
				.status( 403 )
				.send( "access on folder list forbidden" );
		} else {
			res
				.status( 301 )
				.set( "Location", "./index.html" )
				.send( "is directory, see index.html" );
		}
	} );
}
