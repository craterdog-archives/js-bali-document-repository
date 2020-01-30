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
 * This class defines a document repository that is backed by any of a set of possible storage
 * mechanisms.  It treats documents as UTF-8 encoded strings.
 */


// REPOSITORY API

/**
 * This function creates a new instance of a document repository.
 *
 * @param {Object} storage The storage mechanism to be used to maintain the documents.
 * @param {Boolean|Number} debug An optional number in the range [0..3] that controls the level of
 * debugging that occurs:
 * <pre>
 *   0 (or false): no logging
 *   1 (or true): log exceptions to console.error
 *   2: perform argument validation and log exceptions to console.error
 *   3: perform argument validation and log exceptions to console.error and debug info to console.log
 * </pre>
 * @returns {Object} The new document repository.
 */
const DocumentRepository = function(storage, debug) {
    if (debug === null || debug === undefined) debug = 0;  // default is off
    const bali = require('bali-component-framework').api(debug);
    if (debug > 1) {
        const validator = bali.validator(debug);
        validator.validateType('/bali/repositories/DocumentRepository', '$DocumentRepository', '$storage', storage, [
            '/javascript/Object'
        ]);
    }

    /**
     * This method returns a string describing this document repository.
     *
     * @returns {String} A string describing this document repository.
     */
    this.toString = function() {
        const catalog = bali.catalog({
            $module: '/bali/repositories/DocumentRepository',
            $storage: this.storage
        });
        return catalog.toString();
    };

    /**
     * This method checks to see whether or not the named document exists in the document repository.
     *
     * @param {Name} name The unique name for the document being checked.
     * @returns {Boolean} Whether or not the named document exists.
     */
    this.nameExists = async function(name) {
        try {
            if (debug > 1) {
                const validator = bali.validator(debug);
                validator.validateType('/bali/repositories/DocumentRepository', '$nameExists', '$name', name, [
                    '/bali/elements/Name'
                ]);
            }
            return await storage.nameExists(name);
        } catch (cause) {
            const exception = bali.exception({
                $module: '/bali/repositories/DocumentRepository',
                $procedure: '$nameExists',
                $exception: '$unexpected',
                $name: name,
                $text: 'An unexpected error occurred while attempting to verify the existence of a named document.'
            }, cause);
            if (debug) console.error(exception.toString());
            throw exception;
        }
    };

    /**
     * This method attempts to retrieve the named document from the document repository.
     *
     * @param {Name} name The unique name for the document being retrieved.
     * @returns {Catalog} A catalog containing the named document or nothing if it doesn't exist.
     */
    this.readName = async function(name) {
        try {
            if (debug > 1) {
                const validator = bali.validator(debug);
                validator.validateType('/bali/repositories/DocumentRepository', '$readName', '$name', name, [
                    '/bali/elements/Name'
                ]);
            }
            return await storage.readName(name);
        } catch (cause) {
            const exception = bali.exception({
                $module: '/bali/repositories/DocumentRepository',
                $procedure: '$readName',
                $exception: '$unexpected',
                $name: name,
                $text: 'An unexpected error occurred while attempting to retrieved a named document.'
            }, cause);
            if (debug) console.error(exception.toString());
            throw exception;
        }
    };

    /**
     * This method associates a name with the cited document residing in the document repository.
     * The document must already exist in the repository.
     *
     * @param {Name} name The unique name for the document.
     * @param {Catalog} citation A catalog containing the document citation.
     * @returns {Catalog} A catalog containing the document citation.
     */
    this.writeName = async function(name, citation) {
        try {
            if (debug > 1) {
                const validator = bali.validator(debug);
                validator.validateType('/bali/repositories/DocumentRepository', '$writeName', '$name', name, [
                    '/bali/elements/Name'
                ]);
                validator.validateType('/bali/repositories/DocumentRepository', '$writeName', '$citation', citation, [
                    '/bali/collections/Catalog'
                ]);
            }
            return await storage.writeName(name, citation);
        } catch (cause) {
            const exception = bali.exception({
                $module: '/bali/repositories/DocumentRepository',
                $procedure: '$writeName',
                $exception: '$unexpected',
                $name: name,
                $citation: citation,
                $text: 'An unexpected error occurred while attempting to create a named document.'
            }, cause);
            if (debug) console.error(exception.toString());
            throw exception;
        }
    };

    /**
     * This method checks to see whether or not the cited draft document exists in the document
     * repository.
     *
     * @param {Catalog} citation A catalog containing a document citation.
     * @returns {Boolean} Whether or not the cited draft document exists.
     */
    this.draftExists = async function(citation) {
        try {
            if (debug > 1) {
                const validator = bali.validator(debug);
                validator.validateType('/bali/repositories/DocumentRepository', '$draftExists', '$citation', citation, [
                    '/bali/collections/Catalog'
                ]);
            }
            return await storage.draftExists(citation);
        } catch (cause) {
            const exception = bali.exception({
                $module: '/bali/repositories/DocumentRepository',
                $procedure: '$draftExists',
                $exception: '$unexpected',
                $citation: citation,
                $text: 'An unexpected error occurred while attempting to verify the existence of a draft.'
            }, cause);
            if (debug) console.error(exception.toString());
            throw exception;
        }
    };

    /**
     * This method attempts to retrieve the cited draft document from the document repository.
     *
     * @param {Catalog} citation A catalog containing a document citation.
     * @returns {Catalog} A catalog containing the draft document or nothing if it doesn't
     * exist.
     */
    this.readDraft = async function(citation) {
        try {
            if (debug > 1) {
                const validator = bali.validator(debug);
                validator.validateType('/bali/repositories/DocumentRepository', '$readDraft', '$citation', citation, [
                    '/bali/collections/Catalog'
                ]);
            }
            return await storage.readDraft(citation);
        } catch (cause) {
            const exception = bali.exception({
                $module: '/bali/repositories/DocumentRepository',
                $procedure: '$readDraft',
                $exception: '$unexpected',
                $citation: citation,
                $text: 'An unexpected error occurred while attempting to fetch a draft.'
            }, cause);
            if (debug) console.error(exception.toString());
            throw exception;
        }
    };

    /**
     * This method saves a draft document in the document repository. If a draft document with
     * the same tag and version already exists in the document repository, it is overwritten with
     * the new draft.
     *
     * @param {Catalog} draft A catalog containing the draft document.
     * @returns {Catalog} A catalog containing the document citation.
     */
    this.writeDraft = async function(draft) {
        try {
            if (debug > 1) {
                const validator = bali.validator(debug);
                validator.validateType('/bali/repositories/DocumentRepository', '$writeDraft', '$draft', draft, [
                    '/bali/collections/Catalog'
                ]);
            }
            return await storage.writeDraft(draft);
        } catch (cause) {
            const exception = bali.exception({
                $module: '/bali/repositories/DocumentRepository',
                $procedure: '$writeDraft',
                $exception: '$unexpected',
                $draft: draft,
                $text: 'An unexpected error occurred while attempting to save a draft.'
            }, cause);
            if (debug) console.error(exception.toString());
            throw exception;
        }
    };

    /**
     * This method attempts to delete from the document repository the cited draft document.
     * If the draft document does not exist, this method does nothing.
     *
     * @param {Catalog} citation A catalog containing a document citation.
     * @returns {Component|Undefined} The deleted draft document if it existed.
     */
    this.deleteDraft = async function(citation) {
        try {
            if (debug > 1) {
                const validator = bali.validator(debug);
                validator.validateType('/bali/repositories/DocumentRepository', '$deleteDraft', '$citation', citation, [
                    '/bali/collections/Catalog'
                ]);
            }
            return await storage.deleteDraft(citation);
        } catch (cause) {
            const exception = bali.exception({
                $module: '/bali/repositories/DocumentRepository',
                $procedure: '$deleteDraft',
                $exception: '$unexpected',
                $citation: citation,
                $text: 'An unexpected error occurred while attempting to delete a draft.'
            }, cause);
            if (debug) console.error(exception.toString());
            throw exception;
        }
    };

    /**
     * This method checks to see whether or not the cited document exists in the document repository.
     *
     * @param {Catalog} citation A catalog containing a document citation.
     * @returns {Boolean} Whether or not the document exists.
     */
    this.documentExists = async function(citation) {
        try {
            if (debug > 1) {
                const validator = bali.validator(debug);
                validator.validateType('/bali/repositories/DocumentRepository', '$documentExists', '$citation', citation, [
                    '/bali/collections/Catalog'
                ]);
            }
            return await storage.documentExists(citation);
        } catch (cause) {
            const exception = bali.exception({
                $module: '/bali/repositories/DocumentRepository',
                $procedure: '$documentExists',
                $exception: '$unexpected',
                $citation: citation,
                $text: 'An unexpected error occurred while attempting to verify the existence of a document.'
            }, cause);
            if (debug) console.error(exception.toString());
            throw exception;
        }
    };

    /**
     * This method attempts to retrieve the cited document from the document repository.
     *
     * @param {Catalog} citation A catalog containing a document citation.
     * @returns {Catalog} A catalog containing the document or nothing if it doesn't exist.
     */
    this.readDocument = async function(citation) {
        try {
            if (debug > 1) {
                const validator = bali.validator(debug);
                validator.validateType('/bali/repositories/DocumentRepository', '$readDocument', '$citation', citation, [
                    '/bali/collections/Catalog'
                ]);
            }
            return await storage.readDocument(citation);
        } catch (cause) {
            const exception = bali.exception({
                $module: '/bali/repositories/DocumentRepository',
                $procedure: '$readDocument',
                $exception: '$unexpected',
                $citation: citation,
                $text: 'An unexpected error occurred while attempting to fetch a document.'
            }, cause);
            if (debug) console.error(exception.toString());
            throw exception;
        }
    };

    /**
     * This method saves a new document in the document repository. If a document with
     * the same tag and version already exists in the document repository, an exception is
     * thrown.
     *
     * @param {Catalog} document A catalog containing the document.
     * @returns {Catalog} A catalog containing the document citation.
     */
    this.writeDocument = async function(document) {
        try {
            if (debug > 1) {
                const validator = bali.validator(debug);
                validator.validateType('/bali/repositories/DocumentRepository', '$writeDocument', '$document', document, [
                    '/bali/collections/Catalog'
                ]);
            }
            return await storage.writeDocument(document);
        } catch (cause) {
            const exception = bali.exception({
                $module: '/bali/repositories/DocumentRepository',
                $procedure: '$writeDocument',
                $exception: '$unexpected',
                $document: document,
                $text: 'An unexpected error occurred while attempting to create a document.'
            }, cause);
            if (debug) console.error(exception.toString());
            throw exception;
        }
    };

    /**
     * This method determines the current number of messages that are in the specified message bag
     * in the document repository.
     *
     * @param {Catalog} bag A catalog containing a bag citation.
     * @returns {Number} The number of messages that are currently in the message bag.
     */
    this.messageCount = async function(bag) {
        try {
            if (debug > 1) {
                const validator = bali.validator(debug);
                validator.validateType('/bali/repositories/DocumentRepository', '$removeMessage', '$bag', bag, [
                    '/bali/collections/Catalog'
                ]);
            }
            return await storage.messageCount(bag);
        } catch (cause) {
            const exception = bali.exception({
                $module: '/bali/repositories/DocumentRepository',
                $procedure: '$messageCount',
                $exception: '$unexpected',
                $bag: bag,
                $text: 'An unexpected error occurred while attempting to check the number of messages that are in a bag.'
            }, cause);
            if (debug) console.error(exception.toString());
            throw exception;
        }
    };

    /**
     * This method adds a new message into the specified bag in the document repository.
     * If the bag does not exist it will be created. If it is called multiple times with
     * the same message, the message in the bag is overwritten if it still exists.
     *
     * @param {Catalog} bag A catalog containing a bag citation.
     * @param {Catalog} message A catalog containing the message to be added.
     */
    this.addMessage = async function(bag, message) {
        try {
            if (debug > 1) {
                const validator = bali.validator(debug);
                validator.validateType('/bali/repositories/DocumentRepository', '$addMessage', '$bag', bag, [
                    '/bali/collections/Catalog'
                ]);
                validator.validateType('/bali/repositories/DocumentRepository', '$addMessage', '$message', message, [
                    '/bali/collections/Catalog'
                ]);
            }
            return await storage.addMessage(bag, message);
        } catch (cause) {
            const exception = bali.exception({
                $module: '/bali/repositories/DocumentRepository',
                $procedure: '$addMessage',
                $exception: '$unexpected',
                $bag: bag,
                $message: message,
                $text: 'An unexpected error occurred while attempting to bag a message.'
            }, cause);
            if (debug) console.error(exception.toString());
            throw exception;
        }
    };

    /**
     * This method removes a randomly chosen message from the specified bag in the
     * document repository. If the bag is empty, nothing is returned.
     *
     * @param {Catalog} bag A catalog containing a bag citation.
     * @returns {Catalog} A catalog containing the message or nothing if the bag is empty.
     */
    this.removeMessage = async function(bag) {
        try {
            if (debug > 1) {
                const validator = bali.validator(debug);
                validator.validateType('/bali/repositories/DocumentRepository', '$removeMessage', '$bag', bag, [
                    '/bali/collections/Catalog'
                ]);
            }
            return await storage.removeMessage(bag);
        } catch (cause) {
            const exception = bali.exception({
                $module: '/bali/repositories/DocumentRepository',
                $procedure: '$removeMessage',
                $exception: '$unexpected',
                $bag: bag,
                $text: 'An unexpected error occurred while attempting to remove a message.'
            }, cause);
            if (debug) console.error(exception.toString());
            throw exception;
        }
    };

    return this;
};
DocumentRepository.prototype.constructor = DocumentRepository;
exports.DocumentRepository = DocumentRepository;
