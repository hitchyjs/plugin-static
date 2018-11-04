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


describe( "On fetching folders Hitchy plugin static", () => {
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

	it( "rejects requests addressing folder w/o index.html", () => {
		return HitchyDev.query.get( "/files/section-a" )
			.then( res => {
				res.should.have.status( 403 );
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
