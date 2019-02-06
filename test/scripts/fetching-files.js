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


describe( "On fetching files Hitchy plugin static", () => {
	let server = null;

	before( "starting Hitchy", () => {
		return HitchyDev.start( {
			testProjectFolder: Path.resolve( __dirname, "../project" ),
			extensionFolder: Path.resolve( __dirname, "../.." ),
			options: {
				debug: false,
			},
		} )
			.then( instance => {
				server = instance;
			} );
	} );

	after( "stopping Hitchy", () => {
		return server ? HitchyDev.stop( server ) : undefined;
	} );

	it( "is delivering selected Javascript file", () => {
		return HitchyDev.query.get( "/files/test.js" )
			.then( res => {
				res.should.have.status( 200 );
				res.headers["content-type"].should.be.equal( "application/javascript" );
				res.body.toString().trim().should.be.equal( "test.js" );
			} );
	} );

	it( "is delivering selected HTML file", () => {
		return HitchyDev.query.get( "/files/test.html" )
			.then( res => {
				res.should.have.status( 200 );
				res.headers["content-type"].should.be.equal( "text/html" );
				res.body.toString().trim().should.be.equal( "test.html" );
			} );
	} );

	it( "is delivering selected XML file", () => {
		return HitchyDev.query.get( "/files/data.xml" )
			.then( res => {
				res.should.have.status( 200 );
				res.headers["content-type"].should.be.equal( "application/xml" );
				res.body.toString().trim().should.be.equal( "data.xml" );
			} );
	} );

	it( "is delivering selected CSS file (using static provider overlapping w/ another one)", () => {
		return HitchyDev.query.get( "/media/sub/test.css" )
			.then( res => {
				res.should.have.status( 200 );
				res.headers["content-type"].should.be.equal( "text/css" );
				res.body.toString().trim().should.be.equal( "test.css" );
			} );
	} );

	it( "is failing on accessing missing file", () => {
		return HitchyDev.query.get( "/media/sub/missing.css" )
			.then( res => {
				res.should.have.status( 404 );
				res.headers["content-type"].should.be.equal( "text/plain" );
				res.body.toString().trim().should.be.equal( "no such file" );
			} );
	} );

	it( "is delivering configured fallback on requesting missing file", () => {
		return HitchyDev.query.get( "/with-fallback/test.css" )
			.then( res => {
				res.should.have.status( 200 );
				res.headers["content-type"].should.be.equal( "text/css" );
				res.body.toString().trim().should.be.equal( "test.css" );

				return HitchyDev.query.get( "/with-fallback/missing.css" );
			} )
			.then( res => {
				res.should.have.status( 200 );
				res.headers["content-type"].should.be.equal( "image/gif" );
				res.body.toString().trim().should.be.equal( "an-image.gif" );
			} );
	} );
} );
