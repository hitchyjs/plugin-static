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
];
```

On using a configuration like this requesting pathname **/files/some/file.ext** will respond with content of file **<project-folder>/static/files/some/file.ext**. The plugin supports several common sorts of files delivering any unknown type of file with announced content type **application/octet-stream**.
