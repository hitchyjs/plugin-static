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

const { describe, before, after, it } = require( "mocha" );
const HitchyDev = require( "hitchy-server-dev-tools" );

require( "should" );
require( "should-http" );


describe( "Hitchy plugin static", () => {
	const ctx = {};

	before( HitchyDev.before( ctx, {
		testProjectFolder: Path.resolve( __dirname, "../project" ),
		pluginsFolder: Path.resolve( __dirname, "../.." ),
		options: {
			debug: false,
		},
	} ) );

	after( HitchyDev.after( ctx ) );

	it( "accepts GET method for fetching, only", () => {
		return Promise.all( [
			ctx.get( "/files/test.html" ),
			ctx.post( "/files/test.html" ),
			ctx.put( "/files/test.html" ),
			ctx.delete( "/files/test.html" ),
		] )
			.then( ( [ get, post, put, del ] ) => {
				get.should.have.status( 200 );
				get.body.toString().trim().should.be.equal( "test.html" );

				post.should.have.status( 400 );
				post.body.toString().trim().should.not.be.equal( "test.html" );

				put.should.have.status( 400 );
				put.body.toString().trim().should.not.be.equal( "test.html" );

				del.should.have.status( 400 );
				del.body.toString().trim().should.not.be.equal( "test.html" );
			} );
	} );

	it( "supports HEAD method for testing", () => {
		return Promise.all( [
			ctx.request( "HEAD", "/files/test.html" ),
			ctx.request( "HEAD", "/files/test.js" ),
		] )
			.then( ( [ html, js ] ) => {
				html.should.have.status( 200 );
				html.body.toString().should.be.empty();
				html.headers.should.not.have.property( "content-type" );
				html.headers.should.have.property( "content-length" );
				html.headers.should.have.property( "last-modified" );

				js.should.have.status( 200 );
				js.body.toString().should.be.empty();
				js.headers.should.not.have.property( "content-type" );
				js.headers.should.have.property( "content-length" );
				js.headers.should.have.property( "last-modified" );
			} );
	} );
} );
