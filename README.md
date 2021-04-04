# [Hitchy](https://core.hitchy.org) has [moved its repositories](https://gitlab.com/hitchy) incl. [this one](https://gitlab.com/hitchy/plugin-static).

---

# hitchy-plugin-static

Hitchy plugin serving static files

## License

MIT

## Install

In a Hitchy-based project run following command for adding this plugin as a dependency:

```bash
npm install hitchy-plugin-static
```

## Configuration

Create file **config/static.js** in your Hitchy-based project to export a list of folders for statically exposing any contained file.

```javascript
exports.static = [
	{
		prefix: "/files",
		folder: "./static/files",
	},
	{
		prefix: "/media",
		folder: "media",
	},
	{
		prefix: "/app",
		folder: "app",
		fallback: "index.html",
		mime: {
			// adding new MIME types
			".key": "application/x-my-custom-mime-type",

			// replacing existing ones
			".json": "text/json",
		},
		download: {
			// adding declarations for MIME types to be exposed for download
			"application/x-my-custom-mime-type": true,
			
			// adjusting existing records
			"application/xml": true,
		},
        filter( path, filename, isRequested ) {
            // prevent access on files in folder private/
            if ( path.startsWith( "private/" ) ) {
                throw new this.services.HttpException( 403, "this file is private!" );
            }
        },
        process( path, filename, stream ) {
            // deliver any file's content converted to uppercase, only
            const transformed = new ( require( "stream" ).Transform )( {
                transform( chunk, encoding, callback ) {
                    callback( null, chunk.toString( "utf8" ).toUpperCase() );
                }
            } );
        
            stream.pipe( transformed );
        
            return transformed;
        },
	},
];
```

On using a configuration like this, requesting pathname **/files/some/file.ext** will respond with content of file **<project-folder>/static/files/some/file.ext**. The plugin supports several common types of files while delivering any unknown type of file with announcing its content type as **application/octet-stream**.

The last example is including additionally supported configuration parameters:
 
* `fallback` selects a file to be delivered on requests for actually missing files. This is useful in combination with delivering files of web applications that handle routes themselves and thus require all its probable routes referring to the application's bootstrap file.

* `mime` is a map of filename extensions into MIME types to be exposed when providing file matching either extension. This map is merged with an internal map and may extend the latter or replace existing records with different MIME types.

* `download` is a map of MIME types into booleans controlling whether files of either MIME type should be exposed for download or not. The provided map is merged with some internally defined one and may add new entries as well as replace existing ones.

* `filter` is an optional callback invoked per request to decide early whether some picked file may be delivered to the client or not.

  Any provided function is invoked with the [request's context](https://hitchyjs.github.io/core/api/hitchy.html#request-context) as `this`. In addition, provided arguments are 
  
  * the local path name used in requesting URL,
  * the path name of local file to deliver and
  * a boolean set true when tested file is the one actually requested in opposition to the fallback.
  
  The callback is meant to return if fetching the file is okay. It may throw to prevent retrieval of requested file. By throwing [HttpException](https://hitchyjs.github.io/core/api/components/services.html#httpexception) it may control status returned to the client. In addition, by throwing it with status 404 on the actually requested file the fallback retrieval can be triggered.
  
* `process` is another optional callback invoked on delivering a requested file's content. It is meant to take some opened file stream and replace it with another stream to fetch delivered content from instead.

  As an option, it might take the provided file stream and handle the request all by itself, returning null-ish replacement for provided file.
  
  Any function provided in `process` is invoked with the [request's context](https://hitchyjs.github.io/core/api/hitchy.html#request-context) as `this`. In addition, provided arguments are 
                                          
  * the local path name used in requesting URL,
  * the path name of local file to deliver and
  * the stream opened for reading.
  
  The callback should handle errors on provided stream when replacing it. It may return promise for the replacing stream either. It may throw exception or return some eventually rejected promise as well. When throwing or rejecting with [HttpException](https://hitchyjs.github.io/core/api/components/services.html#httpexception) it might affect the response's status code.
