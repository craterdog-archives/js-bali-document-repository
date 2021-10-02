/************************************************************************
 * Copyright (c) Crater Dog Technologies(TM).  All Rights Reserved.     *
 ************************************************************************
 * DO NOT ALTER OR REMOVE COPYRIGHT NOTICES OR THIS FILE HEADER.        *
 *                                                                      *
 * This code is free software; you can redistribute it and/or modify it *
 * under the terms of The MIT License (MIT), as published by the Open   *
 * Source Initiative. (See http://opensource.org/licenses/MIT)          *
 ************************************************************************/

const debug = 0;  // [0..3]
const bali = require('bali-component-framework').api(debug);
const account = bali.tag();
const directory = 'test/config/service/';
const notary = require('bali-digital-notary').test(account, directory, debug);
const storage = require('../').test(notary, directory, debug);
const engine = require('../').application(notary, storage, debug);
const express = require("express");
const bodyParser = require('body-parser');

var notInitialized = async function() {
    const publicKey = await notary.generateKey();
    const certificate = await notary.notarizeDocument(publicKey);
    await notary.activateKey(certificate);
    await storage.writeContract(certificate);
    notInitialized = undefined;
};

if (debug > 0) console.log('Loading the Test Repository Service');

const processRequest = async function(request, response) {
    try {
        if (notInitialized) await notInitialized();
        const result = await engine.processRequest(request);
        response.writeHead(result.statusCode, result.statusMessage, result.headers);
        response.end(result.body);
    } catch (cause) {
        console.error(cause);
    }
};

const router = express.Router();
router.all(':identifier([a-zA-Z0-9/\\.]+)', processRequest);

const service = express();
service.use(bodyParser.text({ type: 'application/bali' }));
service.use('', router);

service.listen(3000, function() {
    var message = 'Test Repository Service: Server running on port 3000';
    if (debug > 1) console.log(message);
});
