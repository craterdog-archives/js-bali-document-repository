/************************************************************************
 * Copyright (c) Crater Dog Technologies(TM).  All Rights Reserved.     *
 ************************************************************************
 * DO NOT ALTER OR REMOVE COPYRIGHT NOTICES OR THIS FILE HEADER.        *
 *                                                                      *
 * This code is free software; you can redistribute it and/or modify it *
 * under the terms of The MIT License (MIT), as published by the Open   *
 * Source Initiative. (See http://opensource.org/licenses/MIT)          *
 ************************************************************************/

const debug = 1;  // [0..3]
const bali = require('bali-component-framework').api(debug);
const notary = require('bali-digital-notary').service(debug);
const directory = 'test/config/';
const repository = require('../').test(notary, directory, debug);
const express = require("express");
const bodyParser = require('body-parser');
const EOL = '\n';


// PRIVATE FUNCTIONS

const getName = function(path) {
    return bali.component(path);
};


const getTag = function(path) {
    return bali.component('#' + path.slice(0, path.lastIndexOf('/')));
};


const getVersion = function(path) {
    return bali.component(path.slice(path.lastIndexOf('/') + 1));
};


const invalidCredentials = async function(request) {
    try {
        const encoded = request.headers['nebula-credentials'];
        const credentials = bali.component(decodeURI(encoded).slice(2, -2));  // strip off double quote delimiters
        const citation = credentials.getValue('$certificate');
        const tag = citation.getValue('$tag');
        const version = citation.getValue('$version');
        const certificate = (await repository.fetchDocument(tag, version)) || bali.component(request.body);  // may be self-signed
        const isValid = await notary.validDocument(credentials, certificate);
        return !isValid;
    } catch (e) {
        var message = 'Test Service: The credentials were badly formed.';
        if (debug > 1) {
            console.log(message);
            console.log(e);
        }
        return true;  // missing the credentials
    }
};


const pingStatic = async function(request, response) {
    var message;
    try {
        const name = getName(request.params.identifier);
        message = 'Test Service: HEAD ' + request.originalUrl;
        if (debug > 1) console.log(message);
        if (await invalidCredentials(request)) {
            message = 'Test Service: The credentials are invalid.';
            if (debug > 1) console.log(message);
            response.writeHead(401, message);
            response.end();
            return;
        }
        if (await repository.staticExists(name)) {
            message = 'Test Service: The static resource exists.';
            if (debug > 1) console.log(message);
            response.writeHead(200, message);
            response.end();
        } else {
            message = 'Test Service: The static resource does not exist.';
            if (debug > 1) console.log(message);
            response.writeHead(404, message);
            response.end();
        }
    } catch (e) {
        message = 'Test Service: The request was badly formed.';
        if (debug > 1) {
            console.log(message);
            console.log(e);
        }
        response.writeHead(400, message);
        response.end();
    }
};


const getStatic = async function(request, response) {
    var message;
    try {
        const name = getName(request.params.identifier);
        message = 'Test Service: GET ' + request.originalUrl;
        if (debug > 1) console.log(message);
        if (await invalidCredentials(request)) {
            message = 'Test Service: The credentials are invalid.';
            if (debug > 1) console.log(message);
            response.writeHead(401, message);
            response.end();
            return;
        }
        var resource = await repository.fetchStatic(name);
        if (resource) {
            var type;
            const string = name.toString();
            switch (string.slice(string.lastIndexOf('.'))) {
                case '.css':
                    type = 'text/css';
                    break;
                case '.gif':
                    type = 'image/gif';
                    resource = Buffer.from(resource, 'utf8');
                    break;
                case '.jpg':
                case '.jpeg':
                    type = 'image/jpeg';
                    resource = Buffer.from(resource, 'utf8');
                    break;
                case '.png':
                    type = 'image/png';
                    resource = Buffer.from(resource, 'utf8');
                    break;
                default:
                    type = 'text/html';
            }
            const options = {
                'Content-Length': resource.length,
                'Content-Type': type,
                'Cache-Control': 'immutable'
            };
            message = 'Test Service: The static resource was retrieved.';
            if (debug > 1) console.log(message);
            if (debug > 2) {
                console.log('    options: ' + JSON.stringify(options));
                console.log('    result type: ' + resource.constructor.name);
            }
            response.writeHead(200, message, options);
            response.end(resource);
        } else {
            message = 'Test Service: The static resource does not exist.';
            if (debug > 1) console.log(message);
            response.writeHead(404, message);
            response.end();
        }
    } catch (e) {
        message = 'Test Service: The request was badly formed.';
        if (debug > 1) {
            console.log(message);
            console.log(e);
        }
        response.writeHead(400, message);
        response.end();
    }
};


const postStatic = async function(request, response) {
    var message;
    try {
        message = 'Test Service: POST ' + request.originalUrl + ' ' + request.body;
        if (debug > 1) console.log(message);
        message = 'Test Service: Static resources cannot be created.';
        if (debug > 1) console.log(message);
        response.writeHead(405, message);
        response.end();
    } catch (e) {
        message = 'Test Service: The request was badly formed.';
        if (debug > 1) {
            console.log(message);
            console.log(e);
        }
        response.writeHead(400, message);
        response.end();
    }
};


const putStatic = async function(request, response) {
    var message;
    try {
        message = 'Test Service: PUT ' + request.originalUrl + ' ' + request.body;
        if (debug > 1) console.log(message);
        message = 'Test Service: Static resources cannot be updated.';
        if (debug > 1) console.log(message);
        response.writeHead(405, message);
        response.end();
    } catch (e) {
        message = 'Test Service: The request was badly formed.';
        if (debug > 1) {
            console.log(message);
            console.log(e);
        }
        response.writeHead(400, message);
        response.end();
    }
};


const deleteStatic = async function(request, response) {
    var message;
    try {
        message = 'Test Service: DELETE ' + request.originalUrl;
        if (debug > 1) console.log(message);
        message = 'Test Service: Static resources cannot be deleted.';
        if (debug > 1) console.log(message);
        response.writeHead(405, message);
        response.end();
    } catch (e) {
        message = 'Test Service: The request was badly formed.';
        if (debug > 1) {
            console.log(message);
            console.log(e);
        }
        response.writeHead(400, message);
        response.end();
    }
};


const pingCitation = async function(request, response) {
    var message;
    try {
        const name = getName(request.params.identifier);
        message = 'Test Service: HEAD ' + request.originalUrl;
        if (debug > 1) console.log(message);
        if (await invalidCredentials(request)) {
            message = 'Test Service: The credentials are invalid.';
            if (debug > 1) console.log(message);
            response.writeHead(401, message);
            response.end();
            return;
        }
        if (await repository.citationExists(name)) {
            message = 'Test Service: The named document citation exists.';
            if (debug > 1) console.log(message);
            response.writeHead(200, message);
            response.end();
        } else {
            message = 'Test Service: The named document citation does not exist.';
            if (debug > 1) console.log(message);
            response.writeHead(404, message);
            response.end();
        }
    } catch (e) {
        message = 'Test Service: The request was badly formed.';
        if (debug > 1) {
            console.log(message);
            console.log(e);
        }
        response.writeHead(400, message);
        response.end();
    }
};


const getCitation = async function(request, response) {
    var message;
    try {
        const name = getName(request.params.identifier);
        message = 'Test Service: GET ' + request.originalUrl;
        if (debug > 1) console.log(message);
        if (await invalidCredentials(request)) {
            message = 'Test Service: The credentials are invalid.';
            if (debug > 1) console.log(message);
            response.writeHead(401, message);
            response.end();
            return;
        }
        const citation = await repository.fetchCitation(name);
        if (citation) {
            const data = citation.toString();
            const options = {
                'Content-Length': data.length,
                'Content-Type': 'application/bali',
                'Cache-Control': 'immutable'
            };
            message = 'Test Service: The document citation was retrieved.';
            if (debug > 1) console.log(message);
            if (debug > 2) {
                console.log('    options: ' + JSON.stringify(options));
                console.log('    result: ' + data);
            }
            response.writeHead(200, message, options);
            response.end(data);
        } else {
            message = 'Test Service: The document citation does not exist.';
            if (debug > 1) console.log(message);
            response.writeHead(404, message);
            response.end();
        }
    } catch (e) {
        message = 'Test Service: The request was badly formed.';
        if (debug > 1) {
            console.log(message);
            console.log(e);
        }
        response.writeHead(400, message);
        response.end();
    }
};


const postCitation = async function(request, response) {
    var message;
    try {
        const name = getName(request.params.identifier);
        message = 'Test Service: POST ' + request.originalUrl + ' ' + request.body;
        if (debug > 1) console.log(message);
        if (await invalidCredentials(request)) {
            message = 'Test Service: The credentials are invalid.';
            if (debug > 1) console.log(message);
            response.writeHead(401, message);
            response.end();
            return;
        }
        if (await repository.citationExists(name)) {
            message = 'Test Service: The document citation already exists.';
            if (debug > 1) console.log(message);
            response.writeHead(409, message);
            response.end();
        } else {
            const citation = bali.component(request.body);
            await repository.createCitation(name, citation);
            message = 'Test Service: The document citation was created.';
            if (debug > 1) console.log(message);
            response.writeHead(201, message);
            response.end();
        }
    } catch (e) {
        message = 'Test Service: The request was badly formed.';
        if (debug > 1) {
            console.log(message);
            console.log(e);
        }
        response.writeHead(400, message);
        response.end();
    }
};


const putCitation = async function(request, response) {
    var message;
    try {
        message = 'Test Service: PUT ' + request.originalUrl + ' ' + request.body;
        if (debug > 1) console.log(message);
        message = 'Test Service: Document citations cannot be updated.';
        if (debug > 1) console.log(message);
        response.writeHead(405, message);
        response.end();
    } catch (e) {
        message = 'Test Service: The request was badly formed.';
        if (debug > 1) {
            console.log(message);
            console.log(e);
        }
        response.writeHead(400, message);
        response.end();
    }
};


const deleteCitation = async function(request, response) {
    var message;
    try {
        message = 'Test Service: DELETE ' + request.originalUrl;
        if (debug > 1) console.log(message);
        message = 'Test Service: Document citations cannot be deleted.';
        if (debug > 1) console.log(message);
        response.writeHead(405, message);
        response.end();
    } catch (e) {
        message = 'Test Service: The request was badly formed.';
        if (debug > 1) {
            console.log(message);
            console.log(e);
        }
        response.writeHead(400, message);
        response.end();
    }
};


const pingDraft = async function(request, response) {
    var message;
    try {
        const tag = getTag(request.params.identifier);
        const version = getVersion(request.params.identifier);
        message = 'Test Service: HEAD ' + request.originalUrl;
        if (debug > 1) console.log(message);
        if (await invalidCredentials(request)) {
            message = 'Test Service: The credentials are invalid.';
            if (debug > 1) console.log(message);
            response.writeHead(401, message);
            response.end();
            return;
        }
        if (await repository.draftExists(tag, version)) {
            message = 'Test Service: The draft document exists.';
            if (debug > 1) console.log(message);
            response.writeHead(200, message);
            response.end();
        } else {
            message = 'Test Service: The draft document does not exist.';
            if (debug > 1) console.log(message);
            response.writeHead(404, message);
            response.end();
        }
    } catch (e) {
        message = 'Test Service: The request was badly formed.';
        if (debug > 1) {
            console.log(message);
            console.log(e);
        }
        response.writeHead(400, message);
        response.end();
    }
};


const getDraft = async function(request, response) {
    var message;
    try {
        const tag = getTag(request.params.identifier);
        const version = getVersion(request.params.identifier);
        message = 'Test Service: GET ' + request.originalUrl;
        if (debug > 1) console.log(message);
        if (await invalidCredentials(request)) {
            message = 'Test Service: The credentials are invalid.';
            if (debug > 1) console.log(message);
            response.writeHead(401, message);
            response.end();
            return;
        }
        const draft = await repository.fetchDraft(tag, version);
        if (draft) {
            const data = draft.toString();
            const options = {
                'Content-Length': data.length,
                'Content-Type': 'application/bali',
                'Cache-Control': 'no-store'
            };
            message = 'Test Service: The draft document was retrieved.';
            if (debug > 1) console.log(message);
            if (debug > 2) {
                console.log('    options: ' + JSON.stringify(options));
                console.log('    result: ' + data);
            }
            response.writeHead(200, message, options);
            response.end(data);
        } else {
            message = 'Test Service: The draft document does not exist.';
            if (debug > 1) console.log(message);
            response.writeHead(404, message);
            response.end();
        }
    } catch (e) {
        message = 'Test Service: The request was badly formed.';
        if (debug > 1) {
            console.log(message);
            console.log(e);
        }
        response.writeHead(400, message);
        response.end();
    }
};


const postDraft = async function(request, response) {
    var message;
    try {
        message = 'Test Service: POST ' + request.originalUrl + ' ' + request.body;
        if (debug > 1) console.log(message);
        message = 'Test Service: Draft documents cannot be posted.';
        if (debug > 1) console.log(message);
        response.writeHead(405, message);
        response.end();
    } catch (e) {
        message = 'Test Service: The request was badly formed.';
        if (debug > 1) {
            console.log(message);
            console.log(e);
        }
        response.writeHead(400, message);
        response.end();
    }
};


const putDraft = async function(request, response) {
    var message;
    try {
        const tag = getTag(request.params.identifier);
        const version = getVersion(request.params.identifier);
        message = 'Test Service: PUT ' + request.originalUrl + ' ' + request.body;
        if (debug > 1) console.log(message);
        if (await invalidCredentials(request)) {
            message = 'Test Service: The credentials are invalid.';
            if (debug > 1) console.log(message);
            response.writeHead(401, message);
            response.end();
            return;
        }
        const updated = await repository.documentExists(tag, version);
        const draft = bali.component(request.body);
        await repository.saveDraft(tag, version, draft);
        if (updated) {
            message = 'Test Service: The draft document was updated.';
            if (debug > 1) console.log(message);
            response.writeHead(204, message);
            response.end();
        } else {
            message = 'Test Service: The draft document was created.';
            if (debug > 1) console.log(message);
            response.writeHead(201, message);
            response.end();
        }
    } catch (e) {
        message = 'Test Service: The request was badly formed.';
        if (debug > 1) {
            console.log(message);
            console.log(e);
        }
        response.writeHead(400, message);
        response.end();
    }
};


const deleteDraft = async function(request, response) {
    var message;
    try {
        const tag = getTag(request.params.identifier);
        const version = getVersion(request.params.identifier);
        message = 'Test Service: DELETE ' + request.originalUrl;
        if (debug > 1) console.log(message);
        if (await invalidCredentials(request)) {
            message = 'Test Service: The credentials are invalid.';
            if (debug > 1) console.log(message);
            response.writeHead(401, message);
            response.end();
            return;
        }
        const existed = await repository.deleteDraft(tag, version);
        if (existed) {
            message = 'Test Service: The draft document was deleted.';
            response.writeHead(200, message);
        } else {
            message = 'Test Service: The draft document did not exist.';
            response.writeHead(404, message);
        }
        if (debug > 1) console.log(message);
        response.end();
    } catch (e) {
        message = 'Test Service: The request was badly formed.';
        if (debug > 1) {
            console.log(message);
            console.log(e);
        }
        response.writeHead(400, message);
        response.end();
    }
};


const pingDocument = async function(request, response) {
    var message;
    try {
        const tag = getTag(request.params.identifier);
        const version = getVersion(request.params.identifier);
        message = 'Test Service: HEAD ' + request.originalUrl;
        if (debug > 1) console.log(message);
        if (await invalidCredentials(request)) {
            message = 'Test Service: The credentials are invalid.';
            if (debug > 1) console.log(message);
            response.writeHead(401, message);
            response.end();
            return;
        }
        if (await repository.documentExists(tag, version)) {
            message = 'Test Service: The notarized document exists.';
            if (debug > 1) console.log(message);
            response.writeHead(200, message);
            response.end();
        } else {
            message = 'Test Service: The notarized document does not exist.';
            if (debug > 1) console.log(message);
            response.writeHead(404, message);
            response.end();
        }
    } catch (e) {
        message = 'Test Service: The request was badly formed.';
        if (debug > 1) {
            console.log(message);
            console.log(e);
        }
        response.writeHead(400, message);
        response.end();
    }
};


const getDocument = async function(request, response) {
    var message;
    try {
        const tag = getTag(request.params.identifier);
        const version = getVersion(request.params.identifier);
        message = 'Test Service: GET ' + request.originalUrl;
        if (debug > 1) console.log(message);
        if (await invalidCredentials(request)) {
            message = 'Test Service: The credentials are invalid.';
            if (debug > 1) console.log(message);
            response.writeHead(401, message);
            response.end();
            return;
        }
        const document = await repository.fetchDocument(tag, version);
        if (document) {
            const data = document.toString();
            if (debug > 1) console.log(message);
            const options = {
                'Content-Length': data.length,
                'Content-Type': 'application/bali',
                'Cache-Control': 'immutable'
            };
            message = 'Test Service: The notarized document was retrieved.';
            if (debug > 1) console.log(message);
            if (debug > 2) {
                console.log('    options: ' + JSON.stringify(options));
                console.log('    result: ' + data);
            }
            response.writeHead(200, message, options);
            response.end(data);
        } else {
            message = 'Test Service: The notarized document does not exist.';
            if (debug > 1) console.log(message);
            response.writeHead(404, message);
            response.end();
        }
    } catch (e) {
        message = 'Test Service: The request was badly formed.';
        if (debug > 1) {
            console.log(message);
            console.log(e);
        }
        response.writeHead(400, message);
        response.end();
    }
};


const postDocument = async function(request, response) {
    var message;
    try {
        const tag = getTag(request.params.identifier);
        const version = getVersion(request.params.identifier);
        const document = bali.component(request.body);
        message = 'Test Service: POST ' + request.originalUrl + ' ' + document;
        if (debug > 1) console.log(message);
        if (await invalidCredentials(request)) {
            message = 'Test Service: The credentials are invalid.';
            if (debug > 1) console.log(message);
            response.writeHead(401, message);
            response.end();
            return;
        }
        if (await repository.documentExists(tag, version)) {
            message = 'Test Service: A committed document with this version already exists.';
            if (debug > 1) console.log(message);
            response.writeHead(409, message);
            response.end();
        } else {
            await repository.createDocument(tag, version, document);
            message = 'Test Service: The notarized document was created.';
            if (debug > 1) console.log(message);
            response.writeHead(201, message);
            response.end();
        }
    } catch (e) {
        message = 'Test Service: The request was badly formed.';
        if (debug > 1) {
            console.log(message);
            console.log(e);
        }
        response.writeHead(400, message);
        response.end();
    }
};


const putDocument = async function(request, response) {
    var message;
    try {
        message = 'Test Service: PUT ' + request.originalUrl + ' ' + request.body;
        if (debug > 1) console.log(message);
        message = 'Test Service: Notarized documents cannot be updated.';
        if (debug > 1) console.log(message);
        response.writeHead(405, message);
        response.end();
    } catch (e) {
        message = 'Test Service: The request was badly formed.';
        if (debug > 1) {
            console.log(message);
            console.log(e);
        }
        response.writeHead(400, message);
        response.end();
    }
};


const deleteDocument = async function(request, response) {
    var message;
    try {
        message = 'Test Service: DELETE ' + request.originalUrl;
        if (debug > 1) console.log(message);
        message = 'Test Service: Notarized documents cannot be deleted.';
        if (debug > 1) console.log(message);
        response.writeHead(405, message);
        response.end();
    } catch (e) {
        message = 'Test Service: The request was badly formed.';
        if (debug > 1) {
            console.log(message);
            console.log(e);
        }
        response.writeHead(400, message);
        response.end();
    }
};


const pingType = async function(request, response) {
    var message;
    try {
        const tag = getTag(request.params.identifier);
        const version = getVersion(request.params.identifier);
        message = 'Test Service: HEAD ' + request.originalUrl;
        if (debug > 1) console.log(message);
        if (await invalidCredentials(request)) {
            message = 'Test Service: The credentials are invalid.';
            if (debug > 1) console.log(message);
            response.writeHead(401, message);
            response.end();
            return;
        }
        if (await repository.typeExists(tag, version)) {
            message = 'Test Service: The notarized type exists.';
            if (debug > 1) console.log(message);
            response.writeHead(200, message);
            response.end();
        } else {
            message = 'Test Service: The notarized type does not exist.';
            if (debug > 1) console.log(message);
            response.writeHead(404, message);
            response.end();
        }
    } catch (e) {
        message = 'Test Service: The request was badly formed.';
        if (debug > 1) {
            console.log(message);
            console.log(e);
        }
        response.writeHead(400, message);
        response.end();
    }
};


const getType = async function(request, response) {
    var message;
    try {
        const tag = getTag(request.params.identifier);
        const version = getVersion(request.params.identifier);
        message = 'Test Service: GET ' + request.originalUrl;
        if (debug > 1) console.log(message);
        if (await invalidCredentials(request)) {
            message = 'Test Service: The credentials are invalid.';
            if (debug > 1) console.log(message);
            response.writeHead(401, message);
            response.end();
            return;
        }
        const type = await repository.fetchType(tag, version);
        if (type) {
            const data = type.toString();
            const options = {
                'Content-Length': data.length,
                'Content-Type': 'application/bali',
                'Cache-Control': 'immutable'
            };
            message = 'Test Service: The notarized type was retrieved.';
            if (debug > 1) console.log(message);
            if (debug > 2) {
                console.log('    options: ' + JSON.stringify(options));
                console.log('    result: ' + data);
            }
            response.writeHead(200, message, options);
            response.end(data);
        } else {
            message = 'Test Service: The notarized type does not exist.';
            if (debug > 1) console.log(message);
            response.writeHead(404, message);
            response.end();
        }
    } catch (e) {
        message = 'Test Service: The request was badly formed.';
        if (debug > 1) {
            console.log(message);
            console.log(e);
        }
        response.writeHead(400, message);
        response.end();
    }
};


const postType = async function(request, response) {
    var message;
    try {
        const tag = getTag(request.params.identifier);
        const version = getVersion(request.params.identifier);
        const type = bali.component(request.body);
        message = 'Test Service: POST ' + request.originalUrl + ' ' + type;
        if (debug > 1) console.log(message);
        if (await invalidCredentials(request)) {
            message = 'Test Service: The credentials are invalid.';
            if (debug > 1) console.log(message);
            response.writeHead(401, message);
            response.end();
            return;
        }
        if (await repository.typeExists(tag, version)) {
            message = 'Test Service: A committed type with this version already exists.';
            if (debug > 1) console.log(message);
            response.writeHead(409, message);
            response.end();
        } else {
            await repository.createType(tag, version, type);
            message = 'Test Service: The notarized type was created.';
            if (debug > 1) console.log(message);
            response.writeHead(201, message);
            response.end();
        }
    } catch (e) {
        message = 'Test Service: The request was badly formed.';
        if (debug > 1) {
            console.log(message);
            console.log(e);
        }
        response.writeHead(400, message);
        response.end();
    }
};


const putType = async function(request, response) {
    var message;
    try {
        message = 'Test Service: PUT ' + request.originalUrl + ' ' + request.body;
        if (debug > 1) console.log(message);
        message = 'Test Service: Notarized types cannot be updated.';
        if (debug > 1) console.log(message);
        response.writeHead(405, message);
        response.end();
    } catch (e) {
        message = 'Test Service: The request was badly formed.';
        if (debug > 1) {
            console.log(message);
            console.log(e);
        }
        response.writeHead(400, message);
        response.end();
    }
};


const deleteType = async function(request, response) {
    var message;
    try {
        message = 'Test Service: DELETE ' + request.originalUrl;
        if (debug > 1) console.log(message);
        message = 'Test Service: Notarized types cannot be deleted.';
        if (debug > 1) console.log(message);
        response.writeHead(405, message);
        response.end();
    } catch (e) {
        message = 'Test Service: The request was badly formed.';
        if (debug > 1) {
            console.log(message);
            console.log(e);
        }
        response.writeHead(400, message);
        response.end();
    }
};


const pingMessage = async function(request, response) {
    var message;
    try {
        message = 'Test Service: HEAD ' + request.originalUrl;
        if (debug > 1) console.log(message);
        message = 'Test Service: Messages cannot be pinged.';
        if (debug > 1) console.log(message);
        response.writeHead(405, message);
        response.end();
    } catch (e) {
        message = 'Test Service: The request was badly formed.';
        if (debug > 1) {
            console.log(message);
            console.log(e);
        }
        response.writeHead(400, message);
        response.end();
    }
};


const getMessage = async function(request, response) {
    var message;
    try {
        message = 'Test Service: GET ' + request.originalUrl;
        if (debug > 1) console.log(message);
        message = 'Test Service: Messages cannot be retrieved without being deleted.';
        if (debug > 1) console.log(message);
        response.writeHead(405, message);
        response.end();
    } catch (e) {
        message = 'Test Service: The request was badly formed.';
        if (debug > 1) {
            console.log(message);
            console.log(e);
        }
        response.writeHead(400, message);
        response.end();
    }
};


const postMessage = async function(request, response) {
    var message;
    try {
        message = 'Test Service: POST ' + request.originalUrl + ' ' + request.body;
        if (debug > 1) console.log(message);
        message = 'Test Service: Messages cannot be posted.';
        if (debug > 1) console.log(message);
        response.writeHead(405, message);
        response.end();
    } catch (e) {
        message = 'Test Service: The request was badly formed.';
        if (debug > 1) {
            console.log(message);
            console.log(e);
        }
        response.writeHead(400, message);
        response.end();
    }
};


const putMessage = async function(request, response) {
    var message;
    try {
        const queue = bali.tag(request.params.identifier);
        message = 'Test Service: PUT ' + request.originalUrl + ' ' + request.body;
        if (debug > 1) console.log(message);
        if (await invalidCredentials(request)) {
            message = 'Test Service: The credentials are invalid.';
            if (debug > 1) console.log(message);
            response.writeHead(401, message);
            response.end();
            return;
        }
        message = bali.component(request.body);
        await repository.queueMessage(queue, message);
        message = 'Test Service: A message was added to the queue.';
        if (debug > 1) console.log(message);
        response.writeHead(201, message);
        response.end();
    } catch (e) {
        message = 'Test Service: The request was badly formed.';
        if (debug > 1) {
            console.log(message);
            console.log(e);
        }
        response.writeHead(400, message);
        response.end();
    }
};


const deleteMessage = async function(request, response) {
    var message;
    try {
        const queue = bali.tag(request.params.identifier);
        message = 'Test Service: DELETE ' + request.originalUrl;
        if (debug > 1) console.log(message);
        if (await invalidCredentials(request)) {
            message = 'Test Service: The credentials are invalid.';
            if (debug > 1) console.log(message);
            response.writeHead(401, message);
            response.end();
            return;
        }
        message = await repository.dequeueMessage(queue);
        if (message) {
            const data = message.toString();
            const options = {
                'Content-Length': data.length,
                'Content-Type': 'application/bali',
                'Cache-Control': 'no-store'
            };
            message = 'Test Service: A message was removed from the queue.';
            if (debug > 1) console.log(message);
            if (debug > 2) {
                console.log('    options: ' + JSON.stringify(options));
                console.log('    result: ' + data);
            }
            response.writeHead(200, message, options);
            response.end(data);
        } else {
            message = 'Test Service: The queue is empty.';
            if (debug > 1) console.log(message);
            response.writeHead(204, message, {
                'Cache-Control': 'no-store'
            });
            response.end();
        }
    } catch (e) {
        message = 'Test Service: The request was badly formed.';
        if (debug > 1) {
            console.log(message);
            console.log(e);
        }
        response.writeHead(400, message);
        response.end();
    }
};


// SERVICE INITIALIZATION

const staticRouter = express.Router();
staticRouter.head(':identifier([a-zA-Z0-9/\\.]+)', pingStatic);
staticRouter.get(':identifier([a-zA-Z0-9/\\.]+)', getStatic);
staticRouter.post(':identifier([a-zA-Z0-9/\\.]+)', postStatic);
staticRouter.put(':identifier([a-zA-Z0-9/\\.]+)', putStatic);
staticRouter.delete(':identifier([a-zA-Z0-9/\\.]+)', deleteStatic);

const citationRouter = express.Router();
// Note: the leading slash is part of the citation name identifier
citationRouter.head(':identifier([a-zA-Z0-9/\\.]+)', pingCitation);
citationRouter.get(':identifier([a-zA-Z0-9/\\.]+)', getCitation);
citationRouter.post(':identifier([a-zA-Z0-9/\\.]+)', postCitation);
citationRouter.put(':identifier([a-zA-Z0-9/\\.]+)', putCitation);
citationRouter.delete(':identifier([a-zA-Z0-9/\\.]+)', deleteCitation);

const draftRouter = express.Router();
draftRouter.head('/:identifier([a-zA-Z0-9/\\.]+)', pingDraft);
draftRouter.get('/:identifier([a-zA-Z0-9/\\.]+)', getDraft);
draftRouter.post('/:identifier([a-zA-Z0-9/\\.]+)', postDraft);
draftRouter.put('/:identifier([a-zA-Z0-9/\\.]+)', putDraft);
draftRouter.delete('/:identifier([a-zA-Z0-9/\\.]+)', deleteDraft);

const documentRouter = express.Router();
documentRouter.head('/:identifier([a-zA-Z0-9/\\.]+)', pingDocument);
documentRouter.get('/:identifier([a-zA-Z0-9/\\.]+)', getDocument);
documentRouter.post('/:identifier([a-zA-Z0-9/\\.]+)', postDocument);
documentRouter.put('/:identifier([a-zA-Z0-9/\\.]+)', putDocument);
documentRouter.delete('/:identifier([a-zA-Z0-9/\\.]+)', deleteDocument);

const typeRouter = express.Router();
typeRouter.head('/:identifier([a-zA-Z0-9/\\.]+)', pingType);
typeRouter.get('/:identifier([a-zA-Z0-9/\\.]+)', getType);
typeRouter.post('/:identifier([a-zA-Z0-9/\\.]+)', postType);
typeRouter.put('/:identifier([a-zA-Z0-9/\\.]+)', putType);
typeRouter.delete('/:identifier([a-zA-Z0-9/\\.]+)', deleteType);

const queueRouter = express.Router();
queueRouter.head('/:identifier([a-zA-Z0-9/\\.]+)', pingMessage);
queueRouter.get('/:identifier([a-zA-Z0-9/\\.]+)', getMessage);
queueRouter.post('/:identifier([a-zA-Z0-9/\\.]+)', postMessage);
queueRouter.put('/:identifier([a-zA-Z0-9/\\.]+)', putMessage);
queueRouter.delete('/:identifier([a-zA-Z0-9/\\.]+)', deleteMessage);

const service = express();

service.use(bodyParser.text({ type: 'application/bali' }));
service.use('/statics', staticRouter);
service.use('/citations', citationRouter);
service.use('/drafts', draftRouter);
service.use('/documents', documentRouter);
service.use('/types', typeRouter);
service.use('/queues', queueRouter);

service.listen(3000, function() {
    var message = 'Service: Server running on port 3000';
    if (debug > 1) console.log(message);
});
