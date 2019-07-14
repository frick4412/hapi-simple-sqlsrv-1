'use strict';

const Hapi = require('@hapi/hapi');
const Path = require('path');
const sql = require('mssql');
const Joi = require('@hapi/joi');
const hbs = require('hbs');


const init = async () => {

    ////// SERVER //////
    const server = Hapi.server({
        port: 3000,
        host: 'localhost',
        debug: {
            request: ['route']  // Sends route classified request.log to console
        }
    });

    ////// DATABASE CONNECTION //////
    const dbconfig = {
        user: 'scrombie',
        password: 'Gr33nway',
        server: '192.168.1.125', // You can use 'localhost\\instance' to connect to named instance
        database: 'Dev',
        port: 1433,
        stream: false,
        pool: {
            max: 10,
            min: 0,
            idleTimeoutMillis: 30000
        },
        options: {
            encrypt: false
        }
    }
    
    ////// ASYNC/AWAIT STYLE CONNECTION POOLING //////
    const apipool = new sql.ConnectionPool(dbconfig);
    apipool.connect('error', err => {
        console.log(err);
    })
    /*
    */

    await server.register(require('@hapi/inert'));
    
    await server.register(require('@hapi/vision'));

    ////// VIEWS //////
    server.views({
        engines: {
            html: hbs
        },
        relativeTo: __dirname,
        path: 'templates',
        //compileMode: 'async',
        layout: true,
        layoutPath: 'templates/layout',
        helpersPath: 'templates/helpers'
    });

    ////// ROUTES //////
    server.route({
        method: 'GET',
        path: '/',
        handler: (request, h) => {
            return `Hello World!`;
        }
    });

    server.route({
        method: 'GET',
        path: '/test',
        handler: (request, h) => {
            request.log('route','Visited test route.');
            return `Test Page.`;
        }
    });

    // Named Parameter
    server.route({
        method: 'GET',
        path: '/hello/{name}',
        handler: (request, h) => {
            return `Hello ${encodeURIComponent(request.params.name)}.`;
        }
    });

    // Query Parameter
    server.route({
        method: 'GET',
        path: '/greetings',
        handler: (request, h) => {
            return `Hello ${request.query.name}.`;
        }
    });

    // Post with Payload
    server.route({
        method: 'POST',
        path: '/login',
        handler: (request, h) => {
            const payload = request.payload;
            // { username: 'ferris', password: 'password' }
            return `Welcome ${encodeURIComponent(payload.username)}!`
        },
        options: {
            auth: false,
            validate: {
                payload: {
                    username: Joi.string().min(1).max(20),
                    password: Joi.string().min(7)
                }
            }
        }
    });

    // Database Query
    server.route({
        method: 'GET',
        path: '/users',
        handler: (request, h) => {
            var result = (async function() {
                try {
                    let result = await apipool.request()
                    .query("select FirstName, LastName from Users")
                    console.log(result)
                    console.log(result.output)
                    return result
                } catch (err) {
                    console.log('Error', err)
                    return err
                }
            })();
            return result;
        }
    });

    // Using a View
    server.route({
        method: 'GET',
        path: '/testview',
        handler: (request, h) => {
            return h.view('index');
        }
    });

    server.route({
        method: '*',
        path: '/{any*}',
        handler: function (request, h) {
            return '404 Error! Page Not Found!';
        }
    });    

    await server.start();
    console.log('Server running on %s', server.info.uri);
};


process.on('unhandledRejection', (err) => {
    console.log(err);
    process.exit(1);
});

init();
