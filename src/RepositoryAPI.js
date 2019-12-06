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
 * This class defines the interface to a document repository.  It treats
 * documents as UTF-8 encoded strings.
 */
const bali = require('bali-component-framework').api();


// REPOSITORY API

/**
 * This function creates a new instance of a document repository interface.
 * 
 * @param {Reference} repository A reference to the URI for this repository.
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
const RepositoryAPI = function(repository, debug) {
    if (debug === null || debug === undefined) debug = 0;  // default is off
    if (debug > 1) {
        const validator = bali.validator(debug);
        validator.validateType('/bali/repositories/RepositoryAPI', '$RepositoryAPI', '$repository', repository, [
            '/javascript/Object'
        ]);
    }

    /**
     * This method returns a string describing this repository API.
     * 
     * @returns {String} A string describing this repository API.
     */
    this.toString = function() {
        const catalog = bali.catalog({
            $module: '/bali/repositories/RepositoryAPI',
            $repository: this.repository
        });
        return catalog.toString();
    };

    /**
     * This method checks to see whether or not a document citation in the document
     * repository is associated with the specified name.
     * 
     * @param {Name} name The unique name for the document citation being checked.
     * @returns {Boolean} Whether or not the document citation exists.
     */
    this.citationExists = async function(name) {
        try {
            if (debug > 1) {
                const validator = bali.validator(debug);
                validator.validateType('/bali/repositories/RepositoryAPI', '$citationExists', '$name', name, [
                    '/bali/elements/Name'
                ]);
            }
            return await repository.citationExists(name);
        } catch (cause) {
            const exception = bali.exception({
                $module: '/bali/repositories/RepositoryAPI',
                $procedure: '$citationExists',
                $exception: '$unexpected',
                $name: name,
                $text: 'An unexpected error occurred while attempting to verify the existence of a citation.'
            }, cause);
            if (debug) console.error(exception.toString());
            throw exception;
        }
    };
    
    /**
     * This method attempts to retrieve the document citation associated with the specified
     * name from the document repository.
     * 
     * @param {Name} name The unique name for the document citation being fetched.
     * @returns {Catalog} A catalog containing the document citation or nothing if it doesn't
     * exist.
     */
    this.fetchCitation = async function(name) {
        try {
            if (debug > 1) {
                const validator = bali.validator(debug);
                validator.validateType('/bali/repositories/RepositoryAPI', '$fetchCitation', '$name', name, [
                    '/bali/elements/Name'
                ]);
            }
            return await repository.readCitation(name);
        } catch (cause) {
            const exception = bali.exception({
                $module: '/bali/repositories/RepositoryAPI',
                $procedure: '$fetchCitation',
                $exception: '$unexpected',
                $name: name,
                $text: 'An unexpected error occurred while attempting to fetch a citation.'
            }, cause);
            if (debug) console.error(exception.toString());
            throw exception;
        }
    };
    
    /**
     * This method associates a new name with the specified document citation in
     * the document repository.
     * 
     * @param {Name} name The unique name for the specified document citation.
     * @param {Catalog} citation A catalog containing the document citation.
     */
    this.createCitation = async function(name, citation) {
        try {
            if (debug > 1) {
                const validator = bali.validator(debug);
                validator.validateType('/bali/repositories/RepositoryAPI', '$createCitation', '$name', name, [
                    '/bali/elements/Name'
                ]);
                validator.validateType('/bali/repositories/RepositoryAPI', '$createCitation', '$citation', citation, [
                    '/bali/collections/Catalog'
                ]);
            }
            await repository.writeCitation(name, citation);
        } catch (cause) {
            const exception = bali.exception({
                $module: '/bali/repositories/RepositoryAPI',
                $procedure: '$createCitation',
                $exception: '$unexpected',
                $name: name,
                $citation: citation,
                $text: 'An unexpected error occurred while attempting to create a citation.'
            }, cause);
            if (debug) console.error(exception.toString());
            throw exception;
        }
    };
    
    /**
     * This method checks to see whether or not a draft document in the document repository
     * is associated with the specified tag and version.
     * 
     * @param {Tag} tag The unique tag for the draft document being checked.
     * @param {Version} version The version string of the draft document.
     * @returns {Boolean} Whether or not the draft document exists.
     */
    this.draftExists = async function(tag, version) {
        try {
            if (debug > 1) {
                const validator = bali.validator(debug);
                validator.validateType('/bali/repositories/RepositoryAPI', '$draftExists', '$tag', tag, [
                    '/bali/elements/Tag'
                ]);
                validator.validateType('/bali/repositories/RepositoryAPI', '$draftExists', '$version', version, [
                    '/bali/elements/Version'
                ]);
            }
            return await repository.documentExists('drafts', tag, version);
        } catch (cause) {
            const exception = bali.exception({
                $module: '/bali/repositories/RepositoryAPI',
                $procedure: '$draftExists',
                $exception: '$unexpected',
                $tag: tag,
                $version: version,
                $citation: citation,
                $text: 'An unexpected error occurred while attempting to verify the existence of a draft.'
            }, cause);
            if (debug) console.error(exception.toString());
            throw exception;
        }
    };
    
    /**
     * This method attempts to retrieve the specified version of a draft document from
     * the document repository.
     * 
     * @param {Tag} tag The unique tag for the draft document being fetched.
     * @param {Version} version The version string of the draft document.
     * @returns {Catalog} A catalog containing the draft document or nothing if it doesn't
     * exist.
     */
    this.fetchDraft = async function(tag, version) {
        try {
            if (debug > 1) {
                const validator = bali.validator(debug);
                validator.validateType('/bali/repositories/RepositoryAPI', '$fetchDraft', '$tag', tag, [
                    '/bali/elements/Tag'
                ]);
                validator.validateType('/bali/repositories/RepositoryAPI', '$fetchDraft', '$version', version, [
                    '/bali/elements/Version'
                ]);
            }
            return await repository.readDocument('drafts', tag, version);
        } catch (cause) {
            const exception = bali.exception({
                $module: '/bali/repositories/RepositoryAPI',
                $procedure: '$fetchDraft',
                $exception: '$unexpected',
                $tag: tag,
                $version: version,
                $text: 'An unexpected error occurred while attempting to fetch a draft.'
            }, cause);
            if (debug) console.error(exception.toString());
            throw exception;
        }
    };
    
    /**
     * This method saves a draft document with the specified tag and version string in
     * the document repository. If a draft document with the same tag and version string
     * already exists in the document repository, it is overwritten with the new draft.
     * 
     * @param {Tag} tag The unique tag for the draft document being saved.
     * @param {Version} version The version string of the draft document.
     * @param {Catalog} draft A catalog containing the draft document.
     */
    this.saveDraft = async function(tag, version, draft) {
        try {
            if (debug > 1) {
                const validator = bali.validator(debug);
                validator.validateType('/bali/repositories/RepositoryAPI', '$saveDraft', '$tag', tag, [
                    '/bali/elements/Tag'
                ]);
                validator.validateType('/bali/repositories/RepositoryAPI', '$saveDraft', '$version', version, [
                    '/bali/elements/Version'
                ]);
                validator.validateType('/bali/repositories/RepositoryAPI', '$saveDraft', '$draft', draft, [
                    '/bali/collections/Catalog'
                ]);
            }
            await repository.writeDocument('drafts', tag, version, draft);
        } catch (cause) {
            const exception = bali.exception({
                $module: '/bali/repositories/RepositoryAPI',
                $procedure: '$saveDraft',
                $exception: '$unexpected',
                $tag: tag,
                $version: version,
                $draft: draft,
                $text: 'An unexpected error occurred while attempting to save a draft.'
            }, cause);
            if (debug) console.error(exception.toString());
            throw exception;
        }
    };
    
    /**
     * This method attempts to delete from the document repository the draft document
     * associated with the specified tag and version string. If the draft document does
     * not exist, this method does nothing.
     * 
     * @param {Tag} tag The unique tag for the draft document being deleted.
     * @param {Version} version The version string of the draft document.
     */
    this.deleteDraft = async function(tag, version) {
        try {
            if (debug > 1) {
                const validator = bali.validator(debug);
                validator.validateType('/bali/repositories/RepositoryAPI', '$deleteDraft', '$tag', tag, [
                    '/bali/elements/Tag'
                ]);
                validator.validateType('/bali/repositories/RepositoryAPI', '$deleteDraft', '$version', version, [
                    '/bali/elements/Version'
                ]);
            }
            return await repository.deleteDocument('drafts', tag, version);
        } catch (cause) {
            const exception = bali.exception({
                $module: '/bali/repositories/RepositoryAPI',
                $procedure: '$deleteDraft',
                $exception: '$unexpected',
                $tag: tag,
                $version: version,
                $text: 'An unexpected error occurred while attempting to delete a draft.'
            }, cause);
            if (debug) console.error(exception.toString());
            throw exception;
        }
    };
    
    /**
     * This method checks to see whether or not a document in the document repository
     * is associated with the specified tag and version.
     * 
     * @param {Tag} tag The unique tag for the document being checked.
     * @param {Version} version The version string of the document.
     * @returns {Boolean} Whether or not the document exists.
     */
    this.documentExists = async function(tag, version) {
        try {
            if (debug > 1) {
                const validator = bali.validator(debug);
                validator.validateType('/bali/repositories/RepositoryAPI', '$documentExists', '$tag', tag, [
                    '/bali/elements/Tag'
                ]);
                validator.validateType('/bali/repositories/RepositoryAPI', '$documentExists', '$version', version, [
                    '/bali/elements/Version'
                ]);
            }
            return await repository.documentExists('documents', tag, version);
        } catch (cause) {
            const exception = bali.exception({
                $module: '/bali/repositories/RepositoryAPI',
                $procedure: '$documentExists',
                $exception: '$unexpected',
                $tag: tag,
                $version: version,
                $text: 'An unexpected error occurred while attempting to verify the existence of a document.'
            }, cause);
            if (debug) console.error(exception.toString());
            throw exception;
        }
    };
    
    /**
     * This method attempts to retrieve the specified version of a document from
     * the document repository.
     * 
     * @param {Tag} tag The unique tag for the document being fetched.
     * @param {Version} version The version string of the document.
     * @returns {Catalog} A catalog containing the document or nothing if it doesn't exist.
     */
    this.fetchDocument = async function(tag, version) {
        try {
            if (debug > 1) {
                const validator = bali.validator(debug);
                validator.validateType('/bali/repositories/RepositoryAPI', '$fetchDocument', '$tag', tag, [
                    '/bali/elements/Tag'
                ]);
                validator.validateType('/bali/repositories/RepositoryAPI', '$fetchDocument', '$version', version, [
                    '/bali/elements/Version'
                ]);
            }
            return await repository.readDocument('documents', tag, version);
        } catch (cause) {
            const exception = bali.exception({
                $module: '/bali/repositories/RepositoryAPI',
                $procedure: '$fetchDocument',
                $exception: '$unexpected',
                $tag: tag,
                $version: version,
                $text: 'An unexpected error occurred while attempting to fetch a document.'
            }, cause);
            if (debug) console.error(exception.toString());
            throw exception;
        }
    };
    
    /**
     * This method creates a document with the specified tag and version string in
     * the document repository. If a document with the same tag and version string
     * already exists in the document repository, an exception is thrown.
     * 
     * @param {Tag} tag The unique tag for the document being created.
     * @param {Version} version The version string of the document.
     * @param {Catalog} document A catalog containing the document.
     */
    this.createDocument = async function(tag, version, document) {
        try {
            if (debug > 1) {
                const validator = bali.validator(debug);
                validator.validateType('/bali/repositories/RepositoryAPI', '$createDocument', '$tag', tag, [
                    '/bali/elements/Tag'
                ]);
                validator.validateType('/bali/repositories/RepositoryAPI', '$createDocument', '$version', version, [
                    '/bali/elements/Version'
                ]);
                validator.validateType('/bali/repositories/RepositoryAPI', '$createDocument', '$document', document, [
                    '/bali/collections/Catalog'
                ]);
            }
            await repository.writeDocument('documents', tag, version, document);
        } catch (cause) {
            const exception = bali.exception({
                $module: '/bali/repositories/RepositoryAPI',
                $procedure: '$createDocument',
                $exception: '$unexpected',
                $tag: tag,
                $version: version,
                $document: document,
                $text: 'An unexpected error occurred while attempting to create a document.'
            }, cause);
            if (debug) console.error(exception.toString());
            throw exception;
        }
    };
    
    /**
     * This method checks to see whether or not a compiled type in the document repository
     * is associated with the specified tag and version.
     * 
     * @param {Tag} tag The unique tag for the compiled type being checked.
     * @param {Version} version The version string of the compiled type.
     * @returns {Boolean} Whether or not the compiled type exists.
     */
    this.typeExists = async function(tag, version) {
        try {
            if (debug > 1) {
                const validator = bali.validator(debug);
                validator.validateType('/bali/repositories/RepositoryAPI', '$typeExists', '$tag', tag, [
                    '/bali/elements/Tag'
                ]);
                validator.validateType('/bali/repositories/RepositoryAPI', '$typeExists', '$version', version, [
                    '/bali/elements/Version'
                ]);
            }
            return await repository.documentExists('types', tag, version);
        } catch (cause) {
            const exception = bali.exception({
                $module: '/bali/repositories/RepositoryAPI',
                $procedure: '$typeExists',
                $exception: '$unexpected',
                $tag: tag,
                $version: version,
                $text: 'An unexpected error occurred while attempting to verify the existence of a type.'
            }, cause);
            if (debug) console.error(exception.toString());
            throw exception;
        }
    };
    
    /**
     * This method attempts to retrieve the specified version of a compiled type from
     * the document repository.
     * 
     * @param {Tag} tag The unique tag for the compiled type being fetched.
     * @param {Version} version The version string of the compiled type.
     * @returns {Catalog} A catalog containing the compiled type or nothing if it doesn't exist.
     */
    this.fetchType = async function(tag, version) {
        try {
            if (debug > 1) {
                const validator = bali.validator(debug);
                validator.validateType('/bali/repositories/RepositoryAPI', '$fetchType', '$tag', tag, [
                    '/bali/elements/Tag'
                ]);
                validator.validateType('/bali/repositories/RepositoryAPI', '$fetchType', '$version', version, [
                    '/bali/elements/Version'
                ]);
            }
            return await repository.readDocument('types', tag, version);
        } catch (cause) {
            const exception = bali.exception({
                $module: '/bali/repositories/RepositoryAPI',
                $procedure: '$fetchType',
                $exception: '$unexpected',
                $tag: tag,
                $version: version,
                $text: 'An unexpected error occurred while attempting to fetch a type.'
            }, cause);
            if (debug) console.error(exception.toString());
            throw exception;
        }
    };
    
    /**
     * This method creates a compiled type with the specified tag and version string in
     * the document repository. If a compiled type with the same tag and version string
     * already exists in the document repository, an exception is thrown.
     * 
     * @param {Tag} tag The unique tag for the compiled type being created.
     * @param {Version} version The version string of the compiled type.
     * @param {Catalog} type A catalog containing the compiled type.
     */
    this.createType = async function(tag, version, type) {
        try {
            if (debug > 1) {
                const validator = bali.validator(debug);
                validator.validateType('/bali/repositories/RepositoryAPI', '$createType', '$tag', tag, [
                    '/bali/elements/Tag'
                ]);
                validator.validateType('/bali/repositories/RepositoryAPI', '$createType', '$version', version, [
                    '/bali/elements/Version'
                ]);
                validator.validateType('/bali/repositories/RepositoryAPI', '$createType', '$type', type, [
                    '/bali/collections/Catalog'
                ]);
            }
            await repository.writeDocument('types', tag, version, type);
        } catch (cause) {
            const exception = bali.exception({
                $module: '/bali/repositories/RepositoryAPI',
                $procedure: '$createType',
                $exception: '$unexpected',
                $tag: tag,
                $version: version,
                $type: type,
                $text: 'An unexpected error occurred while attempting to create a type.'
            }, cause);
            if (debug) console.error(exception.toString());
            throw exception;
        }
    };
    
    /**
     * This method adds a new message onto the specified queue in the document repository.
     * If the queue does not exist it will be created. If it is called multiple times with
     * the same message, multiple copies of the message are placed on the queue.
     * 
     * @param {Tag} queue The unique tag for the message queue.
     * @param {Catalog} message A catalog containing the message to be queued.
     */
    this.queueMessage = async function(queue, message) {
        try {
            if (debug > 1) {
                const validator = bali.validator(debug);
                validator.validateType('/bali/repositories/RepositoryAPI', '$queueMessage', '$queue', queue, [
                    '/bali/elements/Tag'
                ]);
                validator.validateType('/bali/repositories/RepositoryAPI', '$queueMessage', '$message', message, [
                    '/bali/collections/Catalog'
                ]);
            }
            await repository.addMessage(queue, message);
        } catch (cause) {
            const exception = bali.exception({
                $module: '/bali/repositories/RepositoryAPI',
                $procedure: '$queueMessage',
                $exception: '$unexpected',
                $queue: queue,
                $message: message,
                $text: 'An unexpected error occurred while attempting to queue a message.'
            }, cause);
            if (debug) console.error(exception.toString());
            throw exception;
        }
    };
    
    /**
     * This method removes a randomly chosen message from the specified queue in the
     * document repository. If the queue is empty, nothing is returned.
     * 
     * @param {Tag} queue The unique tag for the message queue.
     * @returns {Catalog} A catalog containing the message or nothing if the queue is empty.
     */
    this.dequeueMessage = async function(queue) {
        try {
            if (debug > 1) {
                const validator = bali.validator(debug);
                validator.validateType('/bali/repositories/RepositoryAPI', '$dequeueMessage', '$queue', queue, [
                    '/bali/elements/Tag'
                ]);
            }
            return await repository.removeMessage(queue);
        } catch (cause) {
            const exception = bali.exception({
                $module: '/bali/repositories/RepositoryAPI',
                $procedure: '$dequeueMessage',
                $exception: '$unexpected',
                $queue: queue,
                $text: 'An unexpected error occurred while attempting to dequeue a message.'
            }, cause);
            if (debug) console.error(exception.toString());
            throw exception;
        }
    };

    return this;
};
RepositoryAPI.prototype.constructor = RepositoryAPI;
exports.RepositoryAPI = RepositoryAPI;
