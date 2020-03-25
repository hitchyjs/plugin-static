# hitchy-plugin-static

Hitchy plugin serving static files

## License

MIT

## Install

In a Hitchy-based project run this command to add this plugin as a dependency:

```bash
npm install -S hitchy-plugin-static
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
	},
];
```

On using a configuration like this requesting pathname **/files/some/file.ext** will respond with content of file **<project-folder>/static/files/some/file.ext**. The plugin supports several common sorts of files delivering any unknown type of file with announced content type **application/octet-stream**.

The last example is including additionally supported configuration parameters:
 
* `fallback` selects a file to be delivered on requests for actually missing files. This is useful in combination with web applications that handle routes themselves and thus require all routes referring to the application's bootstrap file.
* `mime` is a map of filename extensions into MIME types to be exposed when providing file matching either extension. This map is merged with an internal map and may extend the latter or replace existing records with different MIME types.
* `download` is a map of MIME types into booleans controlling whether files of either MIME type should be exposed for download or not. The provided map is merged with some internally defined one and may add new entries as well as replace existing ones.
