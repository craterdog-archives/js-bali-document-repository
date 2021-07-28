/************************************************************************
 * Copyright (c) Crater Dog Technologies(TM).  All Rights Reserved.     *
 ************************************************************************
 * DO NOT ALTER OR REMOVE COPYRIGHT NOTICES OR THIS FILE HEADER.        *
 *                                                                      *
 * This code is free software; you can redistribute it and/or modify it *
 * under the terms of The MIT License (MIT), as published by the Open   *
 * Source Initiative. (See http://opensource.org/licenses/MIT)          *
 ************************************************************************/
'use strict';

/*
 * This abstract class defines the interface that all storage mechanisms backing a document
 * repository must support.
 */


// STORAGE MECHANISM API

/**
 * This function creates a new instance of a storage mechanism.  It must be subclassed by a
 * concrete class.
 *
 * @param {Boolean|Number} debug An optional number in the range 0..3 that controls the level of
 * debugging that occurs:
 * <pre>
 *   0 (or false): no logging
 *   1 (or true): log exceptions to console.error
 *   2: perform argument validation and log exceptions to console.error
 *   3: perform argument validation and log exceptions to console.error and debug info to console.log
 * </pre>
 * @returns {Object} The new storage mechanism.
 */
const StorageMechanism = function(debug) {
    if (debug === null || debug === undefined) debug = 0;  // default is off
    this.debug = debug;
    this.bali = require('bali-component-framework').api(debug);
    return this;
};
StorageMechanism.prototype.constructor = StorageMechanism;
exports.StorageMechanism = StorageMechanism;


/**
 * This method returns a string describing this storage mechanism.
 *
 * @returns {String} A string describing this storage mechanism.
 */
StorageMechanism.prototype.toString = function() {
    const exception = this.bali.exception({
        $module: '/bali/repositories/StorageMechanism',
        $procedure: '$toString',
        $exception: '$abstractMethod',
        $text: 'This method must be implemented by a concrete subclass.'
    });
    if (this.debug) console.error(exception.toString());
    throw exception;
};

/**
 * This method checks to see whether or not the named citation exists in the document repository.
 *
 * @param {Name} name The unique name for the citation being checked.
 * @returns {Boolean} Whether or not the named citation exists.
 */
StorageMechanism.prototype.nameExists = async function(name) {
    const exception = this.bali.exception({
        $module: '/bali/repositories/StorageMechanism',
        $procedure: '$nameExists',
        $exception: '$abstractMethod',
        $text: 'This method must be implemented by a concrete subclass.'
    });
    if (this.debug) console.error(exception.toString());
    throw exception;
};

/**
 * This method attempts to retrieve the named citation from the document repository.
 *
 * @param {Name} name The unique name for the citation being retrieved.
 * @returns {Catalog} A catalog containing the named citation or nothing if it doesn't exist.
 */
StorageMechanism.prototype.readName = async function(name) {
    const exception = this.bali.exception({
        $module: '/bali/repositories/StorageMechanism',
        $procedure: '$readName',
        $exception: '$abstractMethod',
        $text: 'This method must be implemented by a concrete subclass.'
    });
    if (this.debug) console.error(exception.toString());
    throw exception;
};

/**
 * This method associates a name with the specified citation in the document repository.
 * The cited contract must already exist in the repository.
 *
 * @param {Name} name The unique name for the citation.
 * @param {Catalog} citation A catalog containing the document citation.
 * @return {Catalog} A catalog containing the document citation.
 */
StorageMechanism.prototype.writeName = async function(name, citation) {
    const exception = this.bali.exception({
        $module: '/bali/repositories/StorageMechanism',
        $procedure: '$writeName',
        $exception: '$abstractMethod',
        $text: 'This method must be implemented by a concrete subclass.'
    });
    if (this.debug) console.error(exception.toString());
    throw exception;
};

/**
 * This method checks to see whether or not the cited document exists in the document
 * repository.
 *
 * @param {Catalog} citation A catalog containing a document citation.
 * @returns {Boolean} Whether or not the cited document exists.
 */
StorageMechanism.prototype.documentExists = async function(citation) {
    const exception = this.bali.exception({
        $module: '/bali/repositories/StorageMechanism',
        $procedure: '$documentExists',
        $exception: '$abstractMethod',
        $text: 'This method must be implemented by a concrete subclass.'
    });
    if (this.debug) console.error(exception.toString());
    throw exception;
};

/**
 * This method attempts to retrieve the cited document from the document repository.
 *
 * @param {Catalog} citation A catalog containing a document citation.
 * @returns {Catalog} A catalog containing the document or nothing if it doesn't
 * exist.
 */
StorageMechanism.prototype.readDocument = async function(citation) {
    const exception = this.bali.exception({
        $module: '/bali/repositories/StorageMechanism',
        $procedure: '$readDocument',
        $exception: '$abstractMethod',
        $text: 'This method must be implemented by a concrete subclass.'
    });
    if (this.debug) console.error(exception.toString());
    throw exception;
};

/**
 * This method saves a document in the document repository. If a document with
 * the same tag and version already exists in the document repository, it is overwritten with
 * the new document.
 *
 * @param {Catalog} document A catalog containing the document.
 * @returns {Catalog} A catalog containing the document citation.
 */
StorageMechanism.prototype.writeDocument = async function(document) {
    const exception = this.bali.exception({
        $module: '/bali/repositories/StorageMechanism',
        $procedure: '$writeDocument',
        $exception: '$abstractMethod',
        $text: 'This method must be implemented by a concrete subclass.'
    });
    if (this.debug) console.error(exception.toString());
    throw exception;
};

/**
 * This method attempts to delete from the document repository the cited document.
 * If the document does not exist, this method does nothing.
 *
 * @param {Catalog} citation A catalog containing a document citation.
 * @returns {Component|Undefined} The deleted document if it existed.
 */
StorageMechanism.prototype.deleteDocument = async function(citation) {
    const exception = this.bali.exception({
        $module: '/bali/repositories/StorageMechanism',
        $procedure: '$deleteDocument',
        $exception: '$abstractMethod',
        $text: 'This method must be implemented by a concrete subclass.'
    });
    if (this.debug) console.error(exception.toString());
    throw exception;
};

/**
 * This method checks to see whether or not the cited contract exists in the document repository.
 *
 * @param {Catalog} citation A catalog containing a document citation.
 * @returns {Boolean} Whether or not the contract exists.
 */
StorageMechanism.prototype.contractExists = async function(citation) {
    const exception = this.bali.exception({
        $module: '/bali/repositories/StorageMechanism',
        $procedure: '$contractExist',
        $exception: '$abstractMethod',
        $text: 'This method must be implemented by a concrete subclass.'
    });
    if (this.debug) console.error(exception.toString());
    throw exception;
};

/**
 * This method attempts to retrieve the cited contract from the document repository.
 *
 * @param {Catalog} citation A catalog containing a document citation.
 * @returns {Catalog} A catalog containing the contract or nothing if it doesn't exist.
 */
StorageMechanism.prototype.readContract = async function(citation) {
    const exception = this.bali.exception({
        $module: '/bali/repositories/StorageMechanism',
        $procedure: '$readContract',
        $exception: '$abstractMethod',
        $text: 'This method must be implemented by a concrete subclass.'
    });
    if (this.debug) console.error(exception.toString());
    throw exception;
};

/**
 * This method saves a new contract in the document repository. If a contract with
 * the same tag and version already exists in the document repository, an exception is
 * thrown.
 *
 * @param {Catalog} contract A catalog containing the contract.
 * @returns {Catalog} A catalog containing the document citation.
 */
StorageMechanism.prototype.writeContract = async function(contract) {
    const exception = this.bali.exception({
        $module: '/bali/repositories/StorageMechanism',
        $procedure: '$writeContract',
        $exception: '$abstractMethod',
        $text: 'This method must be implemented by a concrete subclass.'
    });
    if (this.debug) console.error(exception.toString());
    throw exception;
};

/**
 * This method determines the whether or not there is a message available to be retrieved from
 * the specified message bag in the document repository.
 *
 * @param {Catalog} bag A catalog citing the bag in the document repository.
 * @returns {Boolean} Whether or not there is a message available to be retrieved.
 */
StorageMechanism.prototype.messageAvailable = async function(bag) {
    const exception = this.bali.exception({
        $module: '/bali/repositories/StorageMechanism',
        $procedure: '$messageAvailable',
        $exception: '$abstractMethod',
        $text: 'This method must be implemented by a concrete subclass.'
    });
    if (this.debug) console.error(exception.toString());
    throw exception;
};

/**
 * This method determines the current number of messages that are in the specified message bag
 * in the document repository.
 *
 * @param {Catalog} bag A catalog citing the bag in the document repository.
 * @returns {Number} The number of messages that are currently in the message bag.
 */
StorageMechanism.prototype.messageCount = async function(bag) {
    const exception = this.bali.exception({
        $module: '/bali/repositories/StorageMechanism',
        $procedure: '$messageCount',
        $exception: '$abstractMethod',
        $text: 'This method must be implemented by a concrete subclass.'
    });
    if (this.debug) console.error(exception.toString());
    throw exception;
};

/**
 * This method adds a new message into the specified bag in the document repository.
 *
 * @param {Catalog} bag A catalog citing the bag in the document repository.
 * @param {Catalog} message A catalog containing the message to be added.
 */
StorageMechanism.prototype.addMessage = async function(bag, message) {
    const exception = this.bali.exception({
        $module: '/bali/repositories/StorageMechanism',
        $procedure: '$addMessage',
        $exception: '$abstractMethod',
        $text: 'This method must be implemented by a concrete subclass.'
    });
    if (this.debug) console.error(exception.toString());
    throw exception;
};

/**
 * This method removes a randomly chosen message from the specified bag in the
 * document repository. The removed message will not be available to other clients for one
 * minute. If the client that borrowed the message does not call <code>deleteMessage()</code>
 * within that time, the message is automatically added back into the bag for other clients
 * to process. If the bag is empty, nothing is returned.
 *
 * @param {Catalog} bag A catalog citing the bag in the document repository.
 * @returns {Catalog} A catalog containing the message or nothing if the bag is empty.
 */
StorageMechanism.prototype.removeMessage = async function(bag) {
    const exception = this.bali.exception({
        $module: '/bali/repositories/StorageMechanism',
        $procedure: '$removeMessage',
        $exception: '$abstractMethod',
        $text: 'This method must be implemented by a concrete subclass.'
    });
    if (this.debug) console.error(exception.toString());
    throw exception;
};

/**
 * This method returns an existing message to the specified bag in the document repository.
 * It should be called when the client that removed the message determines that it cannot
 * successfully process the message. The returned message is then available to other clients
 * for processing. Any changes to the state of the message will be reflected in the updated
 * message.
 *
 * @param {Catalog} bag A catalog citing the bag in the document repository.
 * @param {Catalog} message A catalog containing the message being returned.
 */
StorageMechanism.prototype.returnMessage = async function(bag, message) {
    const exception = this.bali.exception({
        $module: '/bali/repositories/StorageMechanism',
        $procedure: '$returnMessage',
        $exception: '$abstractMethod',
        $text: 'This method must be implemented by a concrete subclass.'
    });
    if (this.debug) console.error(exception.toString());
    throw exception;
};

/**
 * This method permanently deletes a message from the specified bag in the document repository.
 * It should be called once the processing of the message has successfully completed.
 *
 * @param {Catalog} bag A catalog citing the bag in the document repository.
 * @param {Catalog} citation A citation for the message to be deleted.
 * @returns {Catalog} The deleted message.
 */
StorageMechanism.prototype.deleteMessage = async function(bag, citation) {
    const exception = this.bali.exception({
        $module: '/bali/repositories/StorageMechanism',
        $procedure: '$deleteMessage',
        $exception: '$abstractMethod',
        $text: 'This method must be implemented by a concrete subclass.'
    });
    if (this.debug) console.error(exception.toString());
    throw exception;
};
