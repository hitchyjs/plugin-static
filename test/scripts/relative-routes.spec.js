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


describe( "Using relative segments in request URL Hitchy plugin static", () => {
	const ctx = {};

	before( HitchyDev.before( ctx, {
		testProjectFolder: Path.resolve( __dirname, "../project" ),
		pluginsFolder: Path.resolve( __dirname, "../.." ),
		options: {
			debug: false,
		},
	} ) );

	after( HitchyDev.after( ctx ) );

	it( "rejects accessing files outside of scope of provided folder", () => {
		return ctx.get( "/media/sub/../test.html" )
			.then( res => {
				res.should.have.status( 400 );
				res.body.toString().trim().should.not.be.equal( "test.html" );
			} );
	} );

	it( "accepts accessing files using .. not leaving scope of provided folder", () => {
		return ctx.get( "/media/sub/media/../test.css" )
			.then( res => {
				res.should.have.status( 200 );
				res.headers["content-type"].should.be.equal( "text/css" );
				res.body.toString().trim().should.be.equal( "test.css" );
			} );
	} );

	it( "accepts accessing files using . in route", () => {
		return ctx.get( "/media/sub/./test.css" )
			.then( res => {
				res.should.have.status( 200 );
				res.headers["content-type"].should.be.equal( "text/css" );
				res.body.toString().trim().should.be.equal( "test.css" );
			} );
	} );
} );
