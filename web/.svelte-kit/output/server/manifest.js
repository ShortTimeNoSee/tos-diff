export const manifest = (() => {
function __memo(fn) {
	let value;
	return () => value ??= (value = fn());
}

return {
	appDir: "_app",
	appPath: "_app",
	assets: new Set([]),
	mimeTypes: {},
	_: {
		client: {start:"_app/immutable/entry/start.DKSDB4rs.js",app:"_app/immutable/entry/app.rfOS3vdJ.js",imports:["_app/immutable/entry/start.DKSDB4rs.js","_app/immutable/chunks/CyuiB0xm.js","_app/immutable/chunks/B8RXrOme.js","_app/immutable/chunks/9UHeostH.js","_app/immutable/chunks/DGlr5f9B.js","_app/immutable/entry/app.rfOS3vdJ.js","_app/immutable/chunks/9UHeostH.js","_app/immutable/chunks/DGlr5f9B.js","_app/immutable/chunks/NZTpNUN0.js","_app/immutable/chunks/B8RXrOme.js","_app/immutable/chunks/LnqMMJI5.js","_app/immutable/chunks/Cx5wE-JE.js"],stylesheets:[],fonts:[],uses_env_dynamic_public:false},
		nodes: [
			__memo(() => import('./nodes/0.js')),
			__memo(() => import('./nodes/1.js')),
			__memo(() => import('./nodes/2.js')),
			__memo(() => import('./nodes/3.js'))
		],
		routes: [
			{
				id: "/",
				pattern: /^\/$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 2 },
				endpoint: null
			},
			{
				id: "/services/[service]",
				pattern: /^\/services\/([^/]+?)\/?$/,
				params: [{"name":"service","optional":false,"rest":false,"chained":false}],
				page: { layouts: [0,], errors: [1,], leaf: 3 },
				endpoint: null
			}
		],
		prerendered_routes: new Set([]),
		matchers: async () => {
			
			return {  };
		},
		server_assets: {}
	}
}
})();
