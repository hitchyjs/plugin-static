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

	it( "is delivering same file via different but overlapping providers", () => {
		return Promise.all( [
			HitchyDev.query.get( "/media/sub/media/an-image.gif" ),
			HitchyDev.query.get( "/media/an-image.gif" ),
		] )
			.then( ( [ resA, resB ] ) => {
				resA.should.have.status( 200 );
				resA.headers["content-type"].should.be.equal( "image/gif" );
				resA.body.toString().trim().should.be.equal( "an-image.gif" );

				resB.should.have.status( 200 );
				resB.headers["content-type"].should.be.equal( "image/gif" );
				resB.body.toString().trim().should.be.equal( "an-image.gif" );
			} );
	} );

	it( "rejects accessing files outside of scope of provided folder", () => {
		return HitchyDev.query.get( "/media/sub/../test.html" )
			.then( res => {
				res.should.have.status( 400 );
				res.body.toString().trim().should.not.be.equal( "test.html" );
			} );
	} );

	it( "accepts accessing files using .. not leaving scope of provided folder", () => {
		return HitchyDev.query.get( "/media/sub/media/../test.css" )
			.then( res => {
				res.should.have.status( 200 );
				res.headers["content-type"].should.be.equal( "text/css" );
				res.body.toString().trim().should.be.equal( "test.css" );
			} );
	} );

	it( "accepts accessing files using . in route", () => {
		return HitchyDev.query.get( "/media/sub/./test.css" )
			.then( res => {
				res.should.have.status( 200 );
				res.headers["content-type"].should.be.equal( "text/css" );
				res.body.toString().trim().should.be.equal( "test.css" );
			} );
	} );

	it( "rejects requests using other method than GET", () => {
		return Promise.all( [
			HitchyDev.query.get( "/files/test.html" ),
			HitchyDev.query.post( "/files/test.html" ),
			HitchyDev.query.put( "/files/test.html" ),
			HitchyDev.query.delete( "/files/test.html" ),
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

	it( "rejects requests addressing folder w/o index.html", () => {
		return HitchyDev.query.get( "/files/section-a" )
			.then( res => {
				res.should.have.status( 404 );
			} );
	} );

	it( "redirects to index.html on requesting folder w/ index.html", () => {
		return Promise.all( [
			HitchyDev.query.get( "/media" ),
			HitchyDev.query.get( "/media/sub/media/" ),
		] )
			.then( ( [ resA, resB ] ) => {
				resA.should.have.status( 301 );
				resA.headers["location"].should.be.equal( "./index.html" );

				resB.should.have.status( 301 );
				resB.headers["location"].should.be.equal( "./index.html" );
			} );
	} );
} );
