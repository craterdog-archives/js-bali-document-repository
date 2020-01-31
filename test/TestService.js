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

const extractName = function(request) {
    const path = request.params.identifier;
    return bali.component(path);
};


const extractCitation = function(request) {
    const path = request.params.identifier;
    const protocol = notary.getProtocols().getItem(-1);  // most recent protocol
    const tag = bali.component('#' + path.slice(0, path.lastIndexOf('/')));
    const version = bali.component(path.slice(path.lastIndexOf('/') + 1));
    const digest = "'" + request.headers['nebula-digest'] + "'";
    const citation = bali.catalog({
        $protocol: protocol,
        $tag: tag,
        $version: version,
        $digest: digest
    }, {
        $type: '/bali/notary/Citation/v1'
    });
    return citation;
};


const invalidCredentials = async function(request) {
    try {
        var credentials = request.headers['nebula-credentials'];
        if (credentials) {
            const decoder = bali.decoder(0, debug);
            credentials = Buffer.from(decoder.base32Decode(credentials)).toString('utf8');
            credentials = bali.component(credentials);
            const citation = credentials.getValue('$certificate');
            var certificate = await repository.readDocument(citation);
            certificate = certificate || bali.component(request.body);  // if self-signed certificate
            const isValid = await notary.validDocument(credentials, certificate);
            return !isValid;
        }
        return false;  // for brower testing only
    } catch (e) {
        var message = 'Test Service: The credentials were badly formed.';
        if (debug > 1) {
            console.log(message);
            console.log(e.toString());
        }
        return true;  // missing the credentials
    }
};


const headName = async function(request, response) {
    var message;
    try {
        message = 'Test Service: HEAD ' + request.originalUrl;
        const name = extractName(request);
        if (debug > 1) console.log(message);
        if (await invalidCredentials(request)) {
            message = 'Test Service: The credentials are invalid.';
            if (debug > 1) console.log(message);
            response.writeHead(401, message);
            response.end();
            return;
        }
        if (!(await repository.nameExists(name))) {
            message = 'Test Service: The named document citation does not exist.';
            if (debug > 1) console.log(message);
            response.writeHead(404, message);
            response.end();
            return;
        }
        message = 'Test Service: The named document citation exists.';
        if (debug > 1) console.log(message);
        response.writeHead(200, message);
        response.end();
    } catch (e) {
        message = 'Test Service: The request was badly formed.';
        if (debug > 1) {
            console.log(message);
            console.log(e.toString());
        }
        response.writeHead(400, message);
        response.end();
    }
};


const getName = async function(request, response) {
    var message;
    try {
        message = 'Test Service: GET ' + request.originalUrl;
        const name = extractName(request);
        if (debug > 1) console.log(message);
        if (await invalidCredentials(request)) {
            message = 'Test Service: The credentials are invalid.';
            if (debug > 1) console.log(message);
            response.writeHead(401, message);
            response.end();
            return;
        }
        const document = await repository.readName(name);
        if (!document) {
            message = 'Test Service: The named document does not exist.';
            if (debug > 1) console.log(message);
            response.writeHead(404, message);
            response.end();
            return;
        }
        const data = document.toString();
        const options = {
            'Content-Length': data.length,
            'Content-Type': 'application/bali',
            'Cache-Control': 'immutable'
        };
        message = 'Test Service: The named document was retrieved.';
        if (debug > 1) console.log(message);
        if (debug > 2) {
            console.log('    options: ' + bali.catalog(options));
            console.log('    result: ' + data);
        }
        response.writeHead(200, message, options);
        response.end(data);
    } catch (e) {
        message = 'Test Service: The request was badly formed.';
        if (debug > 1) {
            console.log(message);
            console.log(e.toString());
        }
        response.writeHead(400, message);
        response.end();
    }
};


const putName = async function(request, response) {
    var message;
    try {
        message = 'Test Service: PUT ' + request.originalUrl + ' ' + request.body;
        const name = extractName(request);
        if (debug > 1) console.log(message);
        if (await invalidCredentials(request)) {
            message = 'Test Service: The credentials are invalid.';
            if (debug > 1) console.log(message);
            response.writeHead(401, message);
            response.end();
            return;
        }
        if (await repository.nameExists(name)) {
            message = 'Test Service: The document citation already exists.';
            if (debug > 1) console.log(message);
            response.writeHead(409, message);
            response.end();
            return;
        }
        var citation = bali.component(request.body);
        if (!(await repository.documentExists(citation))) {
            message = 'Test Service: The cited document must exist.';
            if (debug > 1) console.log(message);
            response.writeHead(409, message);
            response.end();
            return;
        }
        citation = await repository.writeName(name, citation);

        const data = citation.toString();
        const options = {
            'Content-Length': data.length,
            'Content-Type': 'application/bali',
            'Cache-Control': 'no-store'
        };
        message = 'Test Service: The named document citation was created.';
        if (debug > 1) console.log(message);
        if (debug > 2) {
            console.log('    options: ' + bali.catalog(options));
            console.log('    result: ' + data);
        }
        response.writeHead(201, message, options);
        response.end(data);
    } catch (e) {
        message = 'Test Service: The request was badly formed.';
        if (debug > 1) {
            console.log(message);
            console.log(e.toString());
        }
        response.writeHead(400, message);
        response.end();
    }
};


const postName = async function(request, response) {
    var message;
    try {
        message = 'Test Service: POST ' + request.originalUrl + ' ' + request.body;
        if (debug > 1) console.log(message);
        message = 'Test Service: Document names cannot be updated.';
        if (debug > 1) console.log(message);
        response.writeHead(405, message);
        response.end();
    } catch (e) {
        message = 'Test Service: The request was badly formed.';
        if (debug > 1) {
            console.log(message);
            console.log(e.toString());
        }
        response.writeHead(400, message);
        response.end();
    }
};


const deleteName = async function(request, response) {
    var message;
    try {
        message = 'Test Service: DELETE ' + request.originalUrl;
        if (debug > 1) console.log(message);
        message = 'Test Service: Document names cannot be deleted.';
        if (debug > 1) console.log(message);
        response.writeHead(405, message);
        response.end();
    } catch (e) {
        message = 'Test Service: The request was badly formed.';
        if (debug > 1) {
            console.log(message);
            console.log(e.toString());
        }
        response.writeHead(400, message);
        response.end();
    }
};


const headDraft = async function(request, response) {
    var message;
    try {
        message = 'Test Service: HEAD ' + request.originalUrl;
        const citation = extractCitation(request);
        if (debug > 1) console.log(message);
        if (await invalidCredentials(request)) {
            message = 'Test Service: The credentials are invalid.';
            if (debug > 1) console.log(message);
            response.writeHead(401, message);
            response.end();
            return;
        }
        if (!(await repository.draftExists(citation))) {
            message = 'Test Service: The draft document does not exist.';
            if (debug > 1) console.log(message);
            response.writeHead(404, message);
            response.end();
            return;
        }
        message = 'Test Service: The draft document exists.';
        if (debug > 1) console.log(message);
        response.writeHead(200, message);
        response.end();
    } catch (e) {
        message = 'Test Service: The request was badly formed.';
        if (debug > 1) {
            console.log(message);
            console.log(e.toString());
        }
        response.writeHead(400, message);
        response.end();
    }
};


const getDraft = async function(request, response) {
    var message;
    try {
        message = 'Test Service: GET ' + request.originalUrl;
        const citation = extractCitation(request);
        if (debug > 1) console.log(message);
        if (await invalidCredentials(request)) {
            message = 'Test Service: The credentials are invalid.';
            if (debug > 1) console.log(message);
            response.writeHead(401, message);
            response.end();
            return;
        }
        const draft = await repository.readDraft(citation);
        if (!draft) {
            message = 'Test Service: The draft document does not exist.';
            if (debug > 1) console.log(message);
            response.writeHead(404, message);
            response.end();
            return;
        }
        const data = draft.toString();
        const options = {
            'Content-Length': data.length,
            'Content-Type': 'application/bali',
            'Cache-Control': 'no-store'
        };
        message = 'Test Service: The draft document was retrieved.';
        if (debug > 1) console.log(message);
        if (debug > 2) {
            console.log('    options: ' + bali.catalog(options));
            console.log('    result: ' + data);
        }
        response.writeHead(200, message, options);
        response.end(data);
    } catch (e) {
        message = 'Test Service: The request was badly formed.';
        if (debug > 1) {
            console.log(message);
            console.log(e.toString());
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
            console.log(e.toString());
        }
        response.writeHead(400, message);
        response.end();
    }
};


const putDraft = async function(request, response) {
    var message;
    try {
        const draft = bali.component(request.body);
        message = 'Test Service: PUT ' + request.originalUrl + ' ' + draft;
        var citation = extractCitation(request);
        if (debug > 1) console.log(message);
        if (await invalidCredentials(request)) {
            message = 'Test Service: The credentials are invalid.';
            if (debug > 1) console.log(message);
            response.writeHead(401, message);
            response.end();
            return;
        }
        const updated = await repository.documentExists(citation);
        const content = draft.getValue('$content');
        const tag = citation.getValue('$tag');
        const version = citation.getValue('$version');

        if (!tag.isEqualTo(content.getParameter('$tag')) || !version.isEqualTo(content.getParameter('$version'))) {
            message = 'Test Service: The tag and version of the draft document are incorrect.';
            if (debug > 1) console.log(message);
            response.writeHead(409, message);
            response.end();
            return;
        }
        citation = await repository.writeDraft(draft);
        const data = citation.toString();
        const options = {
            'Content-Length': data.length,
            'Content-Type': 'application/bali',
            'Cache-Control': 'no-store'
        };
        message = 'Test Service: The draft document was retrieved.';
        if (debug > 1) console.log(message);
        if (debug > 2) {
            console.log('    options: ' + bali.catalog(options));
            console.log('    result: ' + data);
        }
        if (updated) {
            message = 'Test Service: The draft document was updated.';
            if (debug > 1) console.log(message);
            response.writeHead(200, message, options);
            response.end(data);
        } else {
            message = 'Test Service: The draft document was created.';
            if (debug > 1) console.log(message);
            response.writeHead(201, message, options);
            response.end(data);
        }
    } catch (e) {
        message = 'Test Service: The request was badly formed.';
        if (debug > 1) {
            console.log(message);
            console.log(e.toString());
        }
        response.writeHead(400, message);
        response.end();
    }
};


const deleteDraft = async function(request, response) {
    var message;
    try {
        message = 'Test Service: DELETE ' + request.originalUrl;
        const citation = extractCitation(request);
        if (debug > 1) console.log(message);
        if (await invalidCredentials(request)) {
            message = 'Test Service: The credentials are invalid.';
            if (debug > 1) console.log(message);
            response.writeHead(401, message);
            response.end();
            return;
        }
        const draft = await repository.deleteDraft(citation);
        if (!draft) {
            message = 'Test Service: The draft document did not exist.';
            if (debug > 1) console.log(message);
            response.writeHead(404, message);
            response.end();
            return;
        }
        const data = draft.toString();
        const options = {
            'Content-Length': data.length,
            'Content-Type': 'application/bali',
            'Cache-Control': 'no-store'
        };
        message = 'Test Service: The draft document was deleted.';
        if (debug > 1) console.log(message);
        if (debug > 2) {
            console.log('    options: ' + bali.catalog(options));
            console.log('    result: ' + data);
        }
        response.writeHead(200, message, options);
        response.end(data);
    } catch (e) {
        message = 'Test Service: The request was badly formed.';
        if (debug > 1) {
            console.log(message);
            console.log(e.toString());
        }
        response.writeHead(400, message);
        response.end();
    }
};


const headDocument = async function(request, response) {
    var message;
    try {
        message = 'Test Service: HEAD ' + request.originalUrl;
        const citation = extractCitation(request);
        if (debug > 1) console.log(message);
        if (await invalidCredentials(request)) {
            message = 'Test Service: The credentials are invalid.';
            if (debug > 1) console.log(message);
            response.writeHead(401, message);
            response.end();
            return;
        }
        if (!(await repository.documentExists(citation))) {
            message = 'Test Service: The notarized document does not exist.';
            if (debug > 1) console.log(message);
            response.writeHead(404, message);
            response.end();
            return;
        }
        message = 'Test Service: The notarized document exists.';
        if (debug > 1) console.log(message);
        response.writeHead(200, message);
        response.end();
    } catch (e) {
        message = 'Test Service: The request was badly formed.';
        if (debug > 1) {
            console.log(message);
            console.log(e.toString());
        }
        response.writeHead(400, message);
        response.end();
    }
};


const getDocument = async function(request, response) {
    var message;
    try {
        message = 'Test Service: GET ' + request.originalUrl;
        const citation = extractCitation(request);
        if (debug > 1) console.log(message);
        if (await invalidCredentials(request)) {
            message = 'Test Service: The credentials are invalid.';
            if (debug > 1) console.log(message);
            response.writeHead(401, message);
            response.end();
            return;
        }
        const document = await repository.readDocument(citation);
        if (!document) {
            message = 'Test Service: The notarized document does not exist.';
            if (debug > 1) console.log(message);
            response.writeHead(404, message);
            response.end();
            return;
        }
        const data = document.toString();
        const options = {
            'Content-Length': data.length,
            'Content-Type': 'application/bali',
            'Cache-Control': 'immutable'
        };
        message = 'Test Service: The notarized document was retrieved.';
        if (debug > 1) console.log(message);
        if (debug > 2) {
            console.log('    options: ' + bali.catalog(options));
            console.log('    result: ' + data);
        }
        response.writeHead(200, message, options);
        response.end(data);
    } catch (e) {
        message = 'Test Service: The request was badly formed.';
        if (debug > 1) {
            console.log(message);
            console.log(e.toString());
        }
        response.writeHead(400, message);
        response.end();
    }
};


const putDocument = async function(request, response) {
    var message;
    try {
        const document = bali.component(request.body);
        message = 'Test Service: PUT ' + request.originalUrl + ' ' + document;
        var citation = extractCitation(request);
        if (debug > 1) console.log(message);
        if (await invalidCredentials(request)) {
            message = 'Test Service: The credentials are invalid.';
            if (debug > 1) console.log(message);
            response.writeHead(401, message);
            response.end();
            return;
        }
        if (await repository.documentExists(citation)) {
            message = 'Test Service: A committed document with this version already exists.';
            if (debug > 1) console.log(message);
            response.writeHead(409, message);
            response.end();
            return;
        }
        const content = document.getValue('$content');
        const tag = citation.getValue('$tag');
        const version = citation.getValue('$version');
        if (!tag.isEqualTo(content.getParameter('$tag')) || !version.isEqualTo(content.getParameter('$version'))) {
            message = 'Test Service: The tag and version of the document are incorrect.';
            if (debug > 1) console.log(message);
            response.writeHead(409, message);
            response.end();
            return;
        }
        citation = await repository.writeDocument(document);
        const data = citation.toString();
        await repository.deleteDraft(citation);
        const options = {
            'Content-Length': data.length,
            'Content-Type': 'application/bali',
            'Cache-Control': 'no-store'
        };
        message = 'Test Service: The committed document was created.';
        if (debug > 1) console.log(message);
        response.writeHead(201, message, options);
        response.end(data);
    } catch (e) {
        message = 'Test Service: The request was badly formed.';
        if (debug > 1) {
            console.log(message);
            console.log(e.toString());
        }
        response.writeHead(400, message);
        response.end();
    }
};


const postDocument = async function(request, response) {
    var message;
    try {
        message = 'Test Service: POST ' + request.originalUrl + ' ' + request.body;
        if (debug > 1) console.log(message);
        message = 'Test Service: Notarized documents cannot be updated.';
        if (debug > 1) console.log(message);
        response.writeHead(405, message);
        response.end();
    } catch (e) {
        message = 'Test Service: The request was badly formed.';
        if (debug > 1) {
            console.log(message);
            console.log(e.toString());
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
            console.log(e.toString());
        }
        response.writeHead(400, message);
        response.end();
    }
};


const headBag = async function(request, response) {
    var message;
    try {
        message = 'Test Service: HEAD ' + request.originalUrl;
        if (debug > 1) console.log(message);
        message = 'Test Service: Bags cannot be headed.';
        if (debug > 1) console.log(message);
        response.writeHead(405, message);
        response.end();
    } catch (e) {
        message = 'Test Service: The request was badly formed.';
        if (debug > 1) {
            console.log(message);
            console.log(e.toString());
        }
        response.writeHead(400, message);
        response.end();
    }
};


const getBag = async function(request, response) {
    var message;
    try {
        message = 'Test Service: GET ' + request.originalUrl;
        const bag = extractCitation(request);
        if (debug > 1) console.log(message);
        if (await invalidCredentials(request)) {
            message = 'Test Service: The credentials are invalid.';
            if (debug > 1) console.log(message);
            response.writeHead(401, message);
            response.end();
            return;
        }
        const count = await repository.messageCount(bag);
        if (debug > 1) console.log(message);
        const data = count.toString();
        const options = {
            'Content-Length': data.length,
            'Content-Type': 'application/bali',
            'Cache-Control': 'no-store'
        };
        message = 'Test Service: The message bag contains ' + count + ' messages.';
        if (debug > 1) console.log(message);
        if (debug > 2) {
            console.log('    options: ' + bali.catalog(options));
            console.log('    result: ' + data);
        }
        response.writeHead(200, message, options);
        response.end(data);
    } catch (e) {
        message = 'Test Service: The request was badly formed.';
        if (debug > 1) {
            console.log(message);
            console.log(e.toString());
        }
        response.writeHead(400, message);
        response.end();
    }
};


const putBag = async function(request, response) {
    var message;
    try {
        message = 'Test Service: PUT ' + request.originalUrl + ' ' + request.body;
        if (debug > 1) console.log(message);
        message = 'Test Service: Bags are created and deleted automatically.';
        if (debug > 1) console.log(message);
        response.writeHead(405, message);
        response.end();
    } catch (e) {
        message = 'Test Service: The request was badly formed.';
        if (debug > 1) {
            console.log(message);
            console.log(e.toString());
        }
        response.writeHead(400, message);
        response.end();
    }
};


const postMessage = async function(request, response) {
    var message;
    try {
        message = 'Test Service: POST ' + request.originalUrl + ' ' + request.body;
        const bag = extractCitation(request);
        if (debug > 1) console.log(message);
        if (await invalidCredentials(request)) {
            message = 'Test Service: The credentials are invalid.';
            if (debug > 1) console.log(message);
            response.writeHead(401, message);
            response.end();
            return;
        }
        message = bali.component(request.body);
        const citation = await repository.addMessage(bag, message);
        const data = citation.toString();
        const options = {
            'Content-Length': data.length,
            'Content-Type': 'application/bali',
            'Cache-Control': 'no-store'
        };
        message = 'Test Service: A message was added to the bag.';
        if (debug > 1) console.log(message);
        response.writeHead(201, message, options);
        response.end(data);
    } catch (e) {
        message = 'Test Service: The request was badly formed.';
        if (debug > 1) {
            console.log(message);
            console.log(e.toString());
        }
        response.writeHead(400, message);
        response.end();
    }
};


const deleteMessage = async function(request, response) {
    var message;
    try {
        message = 'Test Service: DELETE ' + request.originalUrl;
        const bag = extractCitation(request);
        if (debug > 1) console.log(message);
        if (await invalidCredentials(request)) {
            message = 'Test Service: The credentials are invalid.';
            if (debug > 1) console.log(message);
            response.writeHead(401, message);
            response.end();
            return;
        }
        message = await repository.removeMessage(bag);
        if (message) {
            const data = message.toString();
            const options = {
                'Content-Length': data.length,
                'Content-Type': 'application/bali',
                'Cache-Control': 'no-store'
            };
            message = 'Test Service: A message was removed from the bag.';
            if (debug > 1) console.log(message);
            if (debug > 2) {
                console.log('    options: ' + bali.catalog(options));
                console.log('    result: ' + data);
            }
            response.writeHead(200, message, options);
            response.end(data);
        } else {
            message = 'Test Service: The bag does not exist.';
            if (debug > 1) console.log(message);
            response.writeHead(404, message);
            response.end();
        }
    } catch (e) {
        message = 'Test Service: The request was badly formed.';
        if (debug > 1) {
            console.log(message);
            console.log(e.toString());
        }
        response.writeHead(400, message);
        response.end();
    }
};


// SERVICE INITIALIZATION

const nameRouter = express.Router();
// Note: the leading slash is part of the named document identifier
nameRouter.head(':identifier([a-zA-Z0-9/\\.]+)', headName);
nameRouter.get(':identifier([a-zA-Z0-9/\\.]+)', getName);
nameRouter.post(':identifier([a-zA-Z0-9/\\.]+)', postName);
nameRouter.put(':identifier([a-zA-Z0-9/\\.]+)', putName);
nameRouter.delete(':identifier([a-zA-Z0-9/\\.]+)', deleteName);

const draftRouter = express.Router();
draftRouter.head('/:identifier([a-zA-Z0-9/\\.]+)', headDraft);
draftRouter.get('/:identifier([a-zA-Z0-9/\\.]+)', getDraft);
draftRouter.post('/:identifier([a-zA-Z0-9/\\.]+)', postDraft);
draftRouter.put('/:identifier([a-zA-Z0-9/\\.]+)', putDraft);
draftRouter.delete('/:identifier([a-zA-Z0-9/\\.]+)', deleteDraft);

const documentRouter = express.Router();
documentRouter.head('/:identifier([a-zA-Z0-9/\\.]+)', headDocument);
documentRouter.get('/:identifier([a-zA-Z0-9/\\.]+)', getDocument);
documentRouter.post('/:identifier([a-zA-Z0-9/\\.]+)', postDocument);
documentRouter.put('/:identifier([a-zA-Z0-9/\\.]+)', putDocument);
documentRouter.delete('/:identifier([a-zA-Z0-9/\\.]+)', deleteDocument);

const bagRouter = express.Router();
bagRouter.head('/:identifier([a-zA-Z0-9/\\.]+)', headBag);
bagRouter.get('/:identifier([a-zA-Z0-9/\\.]+)', getBag);
bagRouter.post('/:identifier([a-zA-Z0-9/\\.]+)', postMessage);
bagRouter.put('/:identifier([a-zA-Z0-9/\\.]+)', putBag);
bagRouter.delete('/:identifier([a-zA-Z0-9/\\.]+)', deleteMessage);

const service = express();

service.use(bodyParser.text({ type: 'application/bali' }));
service.use('/names', nameRouter);
service.use('/drafts', draftRouter);
service.use('/documents', documentRouter);
service.use('/messages', bagRouter);

service.listen(3000, function() {
    var message = 'Service: Server running on port 3000';
    if (debug > 1) console.log(message);
});
