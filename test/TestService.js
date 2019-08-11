/************************************************************************
 * Copyright (c) Crater Dog Technologies(TM).  All Rights Reserved.     *
 ************************************************************************
 * DO NOT ALTER OR REMOVE COPYRIGHT NOTICES OR THIS FILE HEADER.        *
 *                                                                      *
 * This code is free software; you can redistribute it and/or modify it *
 * under the terms of The MIT License (MIT), as published by the Open   *
 * Source Initiative. (See http://opensource.org/licenses/MIT)          *
 ************************************************************************/

const debug = false;  // set to true for request-response logging
const directory = 'test/config/';
const bali = require('bali-component-framework');
const repository = require('../').local(directory, debug);
const express = require("express");
const bodyParser = require('body-parser');
const EOL = '\n';


// PRIVATE FUNCTIONS

const pingCitation = async function(request, response) {
    const name = request.params.identifier;
    var message = 'Test Service: HEAD ' + request.originalUrl;
    if (debug) console.log(message + EOL);
    try {
        if (await repository.citationExists(name)) {
            message = 'The named document citation exists.';
            if (debug) console.log(message + EOL);
            response.writeHead(200, message);
            response.end();
        } else {
            message = 'The named document citation does not exist.';
            if (debug) console.log(message + EOL);
            response.writeHead(404, message);
            response.end();
        }
    } catch (e) {
        message = 'The request was badly formed.';
        if (debug) console.log(message + EOL);
        response.writeHead(400, message);
        response.end();
    }
};


const getCitation = async function(request, response) {
    const name = request.params.identifier;
    var message = 'Test Service: GET ' + request.originalUrl;
    if (debug) console.log(message + EOL);
    try {
        const citation = await repository.fetchCitation(name);
        if (citation) {
            const data = citation.toString();
            message = 'The named document citation was retrieved.';
            if (debug) console.log(message + EOL);
            response.writeHead(200, message, {
                'Content-Length': data.length,
                'Content-Type': 'application/bali',
                'Cache-Control': 'immutable'
            });
            message = '    result: ' + data;
            if (debug) console.log(message + EOL);
            response.end(data);
        } else {
            message = 'The named document citation does not exist.';
            if (debug) console.log(message + EOL);
            response.writeHead(404, message);
            response.end();
        }
    } catch (e) {
        message = 'The request was badly formed.';
        if (debug) console.log(message + EOL);
        response.writeHead(400, message);
        response.end();
    }
};


const postCitation = async function(request, response) {
    const name = request.params.identifier;
    var message = 'Test Service: POST ' + request.originalUrl + ' ' + request.body;
    if (debug) console.log(message + EOL);
    try {
        const citation = request.body;
        if (await repository.citationExists(name)) {
            message = 'The named document citation already exists.';
            if (debug) console.log(message + EOL);
            response.writeHead(409, message);
            response.end();
        } else {
            await repository.createCitation(name, citation);
            message = 'The named document citation was created.';
            if (debug) console.log(message + EOL);
            response.writeHead(201, message);
            response.end();
        }
    } catch (e) {
        message = 'The request was badly formed.';
        if (debug) console.log(message + EOL);
        response.writeHead(400, message);
        response.end();
    }
};


const putCitation = async function(request, response) {
    var message = 'Test Service: PUT ' + request.originalUrl + ' ' + request.body;
    if (debug) console.log(message + EOL);
    message = 'Named document citations cannot be updated.';
    if (debug) console.log(message + EOL);
    response.writeHead(405, message);
    response.end();
};


const deleteCitation = async function(request, response) {
    var message = 'Test Service: DELETE ' + request.originalUrl;
    if (debug) console.log(message + EOL);
    message = 'Named document citations cannot be deleted.';
    if (debug) console.log(message + EOL);
    response.writeHead(405, message);
    response.end();
};


const pingDraft = async function(request, response) {
    const draftId = request.params.identifier;
    var message = 'Test Service: HEAD ' + request.originalUrl;
    if (debug) console.log(message + EOL);
    try {
        if (await repository.draftExists(draftId)) {
            message = 'The draft document exists.';
            if (debug) console.log(message + EOL);
            response.writeHead(200, message);
            response.end();
        } else {
            message = 'The draft document does not exist.';
            if (debug) console.log(message + EOL);
            response.writeHead(404, message);
            response.end();
        }
    } catch (e) {
        message = 'The request was badly formed.';
        if (debug) console.log(message + EOL);
        response.writeHead(400, message);
        response.end();
    }
};


const getDraft = async function(request, response) {
    const draftId = request.params.identifier;
    var message = 'Test Service: GET ' + request.originalUrl;
    if (debug) console.log(message + EOL);
    try {
        const draft = await repository.fetchDraft(draftId);
        if (draft) {
            const data = draft.toString();
            message = 'The draft document was retrieved.';
            if (debug) console.log(message + EOL);
            response.writeHead(200, message, {
                'Content-Length': data.length,
                'Content-Type': 'application/bali',
                'Cache-Control': 'no-store'
            });
            message = '    result: ' + data;
            if (debug) console.log(message + EOL);
            response.end(data);
        } else {
            message = 'The draft document does not exist.';
            if (debug) console.log(message + EOL);
            response.writeHead(404, message);
            response.end();
        }
    } catch (e) {
        message = 'The request was badly formed.';
        if (debug) console.log(message + EOL);
        response.writeHead(400, message);
        response.end();
    }
};


const postDraft = async function(request, response) {
    const draftId = request.params.identifier;
    var message = 'Test Service: POST ' + request.originalUrl + ' ' + request.body;
    if (debug) console.log(message + EOL);
    message = 'Draft documents cannot be posted.';
    if (debug) console.log(message + EOL);
    response.writeHead(405, message);
    response.end();
};


const putDraft = async function(request, response) {
    const draftId = request.params.identifier;
    var message = 'Test Service: PUT ' + request.originalUrl + ' ' + request.body;
    if (debug) console.log(message + EOL);
    try {
        const draft = request.body;
        if (await repository.documentExists(draftId)) {
            message = 'A committed document with this version already exists.';
            if (debug) console.log(message + EOL);
            response.writeHead(409, message);
            response.end();
        } else {
            await repository.saveDraft(draftId, draft);
            message = 'The draft document was saved.';
            if (debug) console.log(message + EOL);
            response.writeHead(201, message);
            response.end();
        }
    } catch (e) {
        message = 'The request was badly formed.';
        if (debug) console.log(message + EOL);
        response.writeHead(400, message);
        response.end();
    }
};


const deleteDraft = async function(request, response) {
    const draftId = request.params.identifier;
    var message = 'Test Service: DELETE ' + request.originalUrl;
    if (debug) console.log(message + EOL);
    try {
        if (await repository.draftExists(draftId)) {
            await repository.deleteDraft(draftId);
            message = 'The draft document was deleted.';
            if (debug) console.log(message + EOL);
            response.writeHead(200, message);
            response.end();
        } else {
            message = 'The draft document does not exist.';
            if (debug) console.log(message + EOL);
            response.writeHead(404, message);
            response.end();
        }
    } catch (e) {
        message = 'The request was badly formed.';
        if (debug) console.log(message + EOL);
        response.writeHead(400, message);
        response.end();
    }
};


const pingDocument = async function(request, response) {
    const documentId = request.params.identifier;
    var message = 'Test Service: HEAD ' + request.originalUrl;
    if (debug) console.log(message + EOL);
    try {
        if (await repository.documentExists(documentId)) {
            message = 'The notarized document exists.';
            if (debug) console.log(message + EOL);
            response.writeHead(200, message);
            response.end();
        } else {
            message = 'The notarized document does not exist.';
            if (debug) console.log(message + EOL);
            response.writeHead(404, message);
            response.end();
        }
    } catch (e) {
        message = 'The request was badly formed.';
        if (debug) console.log(message + EOL);
        response.writeHead(400, message);
        response.end();
    }
};


const getDocument = async function(request, response) {
    const documentId = request.params.identifier;
    var message = 'Test Service: GET ' + request.originalUrl;
    if (debug) console.log(message + EOL);
    try {
        const documentId = request.params.identifier;
        const document = await repository.fetchDocument(documentId);
        if (document) {
            const data = document.toString();
            message = 'The notarized document was retrieved.';
            if (debug) console.log(message + EOL);
            response.writeHead(200, message, {
                'Content-Length': data.length,
                'Content-Type': 'application/bali',
                'Cache-Control': 'immutable'
            });
            message = '    result: ' + data;
            if (debug) console.log(message + EOL);
            response.end(data);
        } else {
            message = 'The notarized document does not exist.';
            if (debug) console.log(message + EOL);
            response.writeHead(404, message);
            response.end();
        }
    } catch (e) {
        message = 'The request was badly formed.';
        if (debug) console.log(message + EOL);
        response.writeHead(400, message);
        response.end();
    }
};


const postDocument = async function(request, response) {
    const documentId = request.params.identifier;
    var message = 'Test Service: POST ' + request.originalUrl + ' ' + request.body;
    if (debug) console.log(message + EOL);
    try {
        const document = request.body;
        if (await repository.documentExists(documentId)) {
            message = 'A committed document with this version already exists.';
            if (debug) console.log(message + EOL);
            response.writeHead(409, message);
            response.end();
        } else {
            await repository.createDocument(documentId, document);
            message = 'The notarized document was created.';
            if (debug) console.log(message + EOL);
            response.writeHead(201, message);
            response.end();
        }
    } catch (e) {
        message = 'The request was badly formed.';
        if (debug) console.log(message + EOL);
        response.writeHead(400, message);
        response.end();
    }
};


const putDocument = async function(request, response) {
    const documentId = request.params.identifier;
    var message = 'Test Service: PUT ' + request.originalUrl + ' ' + request.body;
    if (debug) console.log(message + EOL);
    message = 'Notarized documents cannot be updated.';
    if (debug) console.log(message + EOL);
    response.writeHead(405, message);
    response.end();
};


const deleteDocument = async function(request, response) {
    const documentId = request.params.identifier;
    var message = 'Test Service: DELETE ' + request.originalUrl;
    if (debug) console.log(message + EOL);
    message = 'Notarized documents cannot be deleted.';
    if (debug) console.log(message + EOL);
    response.writeHead(405, message);
    response.end();
};


const pingQueue = async function(request, response) {
    const queueId = request.params.identifier;
    var message = 'Test Service: HEAD ' + request.originalUrl;
    if (debug) console.log(message + EOL);
    message = 'Queues cannot be pinged.';
    if (debug) console.log(message + EOL);
    response.writeHead(405, message);
    response.end();
};


const postQueue = async function(request, response) {
    const queueId = request.params.identifier;
    var message = 'Test Service: POST ' + request.originalUrl + ' ' + request.body;
    if (debug) console.log(message + EOL);
    message = 'Queues cannot be created.';
    if (debug) console.log(message + EOL);
    response.writeHead(405, message);
    response.end();
};


const deleteQueue = async function(request, response) {
    const queueId = request.params.identifier;
    var message = 'Test Service: DELETE ' + request.originalUrl;
    if (debug) console.log(message + EOL);
    message = 'Queues cannot be deleted.';
    if (debug) console.log(message + EOL);
    response.writeHead(405, message);
    response.end();
};


const putMessage = async function(request, response) {
    const queueId = request.params.identifier;
    var message = 'Test Service: PUT ' + request.originalUrl + ' ' + request.body;
    if (debug) console.log(message + EOL);
    try {
        message = request.body;
        await repository.queueMessage(queueId, message);
        message = 'A message was added to the queue.';
        if (debug) console.log(message + EOL);
        response.writeHead(201, message);
        response.end();
    } catch (e) {
        message = 'The request was badly formed.';
        if (debug) console.log(message + EOL);
        response.writeHead(400, message);
        response.end();
    }
};


const getMessage = async function(request, response) {
    const queueId = request.params.identifier;
    var message = 'Test Service: GET ' + request.originalUrl;
    if (debug) console.log(message + EOL);
    try {
        message = await repository.dequeueMessage(queueId);
        if (message) {
            const data = message.toString();
            message = 'A message was removed from the queue.';
            response.writeHead(200, message, {
                'Content-Length': data.length,
                'Content-Type': 'application/bali',
                'Cache-Control': 'no-store'
            });
            message = '    result: ' + data;
            if (debug) console.log(message + EOL);
            response.end(data);
        } else {
            message = 'The queue is empty.';
            if (debug) console.log(message + EOL);
            response.writeHead(204, message);
            response.end();
        }
    } catch (e) {
        message = 'The request was badly formed.';
        if (debug) console.log(message + EOL);
        response.writeHead(400, message);
        response.end();
    }
};


// SERVICE INITIALIZATION

const citationRouter = express.Router();
citationRouter.head('/:identifier([a-zA-Z0-9/\\.]+)', pingCitation);
citationRouter.post('/:identifier([a-zA-Z0-9/\\.]+)', postCitation);
citationRouter.get('/:identifier([a-zA-Z0-9/\\.]+)', getCitation);
citationRouter.put('/:identifier([a-zA-Z0-9/\\.]+)', putCitation);
citationRouter.delete('/:identifier([a-zA-Z0-9/\\.]+)', deleteCitation);

const draftRouter = express.Router();
draftRouter.head('/:identifier', pingDraft);
draftRouter.post('/:identifier', postDraft);
draftRouter.get('/:identifier', getDraft);
draftRouter.put('/:identifier', putDraft);
draftRouter.delete('/:identifier', deleteDraft);

const documentRouter = express.Router();
documentRouter.head('/:identifier', pingDocument);
documentRouter.post('/:identifier', postDocument);
documentRouter.get('/:identifier', getDocument);
documentRouter.put('/:identifier', putDocument);
documentRouter.delete('/:identifier', deleteDocument);

const queueRouter = express.Router();
queueRouter.head('/:identifier', pingQueue);
queueRouter.post('/:identifier', postQueue);
queueRouter.get('/:identifier', getMessage);
queueRouter.put('/:identifier', putMessage);
queueRouter.delete('/:identifier', deleteQueue);

const service = express();

service.use(bodyParser.text({ type: 'application/bali' }));
service.use('/citation', citationRouter);
service.use('/draft', draftRouter);
service.use('/document', documentRouter);
service.use('/queue', queueRouter);

service.listen(3000, function() {
    var message = 'Service: Server running on port 3000';
    if (debug) console.log(message);
});
