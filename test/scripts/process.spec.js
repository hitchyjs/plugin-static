/**
 * (c) 2020 cepharum GmbH, Berlin, http://cepharum.de
 *
 * The MIT License (MIT)
 *
 * Copyright (c) 2020 cepharum GmbH
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

const { describe, it, before, after } = require( "mocha" );
const HitchyDev = require( "hitchy-server-dev-tools" );
require( "should" );

global.myFilter = function( url, pathname, isRequested ) { // eslint-disable-line no-unused-vars
	if ( url.match( /\bsecret\.txt/ ) ) {
		throw new this.services.HttpException( 403, "this one is hidden" );
	}
};

global.myProcessor = function( url, pathname, stream ) { // eslint-disable-line no-unused-vars
	if ( url.match( /\bpublic\.txt/ ) ) {
		return stream;
	}

	if ( url.match( /\bpublic\.json/ ) ) {
		this.response.json( { different: true } );
		stream.destroy();
		return null;
	}

	const transformed = new ( require( "stream" ).Transform )( {
		transform( chunk, encoding, callback ) {
			callback( null, chunk.toString( "utf8" ).toUpperCase() );
		}
	} );

	stream.pipe( transformed );

	return transformed;
};

describe( "Filter callback", () => {
	const ctx = {};

	before( HitchyDev.before( ctx, {
		pluginsFolder: Path.resolve( __dirname, "../.." ),
		files: {
			"config/static.js": `exports.static = [ { prefix: "/files", folder: "files", filter: global.myFilter } ];`,
			"files/public.txt": `hello world`,
			"files/secret.txt": `do not expose`,
		},
	} ) );

	after( HitchyDev.after( ctx ) );

	it( "is obeyed", () => {
		return ctx.get( "/files/public.txt" )
			.then( response => {
				response.statusCode.should.be.equal( 200 );
				response.text.should.be.equal( "hello world" );

				return ctx.get( "/files/secret.txt" );
			} )
			.then( response => {
				response.statusCode.should.be.equal( 403 );
				response.text.should.be.equal( "accessing file or folder forbidden" );
			} );
	} );
} );

describe( "Process callback", () => {
	const ctx = {};

	before( HitchyDev.before( ctx, {
		pluginsFolder: Path.resolve( __dirname, "../.." ),
		files: {
			"config/static.js": `exports.static = [ { prefix: "/files", folder: "files", filter: global.myFilter, process: global.myProcessor } ];`,
			"files/public.txt": `hello world`,
			"files/public.json": `hello world?`,
			"files/processed.txt": `this is uppercase!`,
			"files/secret.txt": `do not expose`,
		},
	} ) );

	after( HitchyDev.after( ctx ) );

	it( "is obeyed", () => {
		return ctx.get( "/files/public.txt" )
			.then( response => {
				response.statusCode.should.be.equal( 200 );
				response.text.should.be.equal( "hello world" );

				return ctx.get( "/files/secret.txt" );
			} )
			.then( response => {
				response.statusCode.should.be.equal( 403 );
				response.text.should.be.equal( "accessing file or folder forbidden" );

				return ctx.get( "/files/processed.txt" );
			} )
			.then( response => {
				response.statusCode.should.be.equal( 200 );
				response.text.should.be.equal( "THIS IS UPPERCASE!" );

				return ctx.get( "/files/public.json" );
			} )
			.then( response => {
				response.statusCode.should.be.equal( 200 );
				response.data.different.should.be.true();
			} );
	} );
} );
