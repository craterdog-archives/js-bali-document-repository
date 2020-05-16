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
const storage = require('../').test(notary, directory, debug);
const engine = require('../').engine(notary, storage, debug);
const express = require("express");
const bodyParser = require('body-parser');

if (debug > 0) console.log('Loading the Test Repository Service');

const processRequest = async function(request, response) {
    const result = await engine.processRequest(request);
    response.writeHead(result.statusCode, result.statusMessage, result.headers);
    response.end(result.body);
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
