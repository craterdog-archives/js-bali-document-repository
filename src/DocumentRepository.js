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
 * @param {DigitalNotary} notary The digital notary to be used to notarize the documents.
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
const DocumentRepository = function(notary, storage, debug) {
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
     * This method creates a new document of the specified type using the specified template.
     *
     * @param {Name} type The type of the document to be created.
     * @param {Name} permissions The permissions controlling the access to the new document.
     * @param {Sequential} template A sequence of attribute values for the new document.
     * @returns {Catalog} A catalog defining the content of the new document.
     */
    this.createDraft = async function(type, permissions, template) {
        try {
            if (debug > 1) {
                const validator = bali.validator(debug);
                validator.validateType('/bali/repositories/DocumentRepository', '$createDraft', '$type', type, [
                    '/bali/elements/Name'
                ]);
                validator.validateType('/bali/repositories/DocumentRepository', '$createDraft', '$permissions', permissions, [
                    '/bali/elements/Name'
                ]);
                validator.validateType('/bali/repositories/DocumentRepository', '$createDraft', '$template', template, [
                    '/javascript/Undefined',
                    '/javascript/Array',
                    '/javascript/Object',
                    '/bali/interfaces/Sequential'
                ]);
            }
            const document = bali.catalog({}, {
                $type: type,
                $tag: bali.tag(),
                $version: bali.version(),
                $permissions: permissions,
                $previous: 'none'
            });
            const citation = await storage.readName(type);
            if (!citation) {
                const exception = bali.exception({
                    $module: '/bali/repositories/DocumentRepository',
                    $procedure: '$createDraft',
                    $exception: '$unknownType',
                    $type: type,
                    $text: 'The specified document type does not exist.'
                });
                throw exception;
            }
            const content = await storage.readDocument(citation).getValue('$content');
            const attributes = content.getValue('$attributes');
            if (attributes) {
                const iterator = attributes.getIterator();
                while (iterator.hasNext()) {
                    const attribute = iterator.getNext();
                    const name = attribute.getKey();
                    const value = attribute.getValue().getValue('$default');
                    document.setValue(name, value);
                }
            }
            document.addItems(template);
        } catch (cause) {
            const exception = bali.exception({
                $module: '/bali/repositories/DocumentRepository',
                $procedure: '$createDraft',
                $exception: '$unexpected',
                $type: type,
                $permissions: permissions,
                $template: template,
                $text: 'An unexpected error occurred while attempting to create a document of a given type.'
            }, cause);
            if (debug) console.error(exception.toString());
            throw exception;
        }
    };

    /**
     * This method saves a draft document in the document repository. If a draft document with
     * the same tag and version already exists in the document repository, it is overwritten with
     * the new draft document. If not, a new draft document is created in the document repository.
     *
     * @param {Catalog} draft A catalog containing the draft document.
     * @returns {Catalog} A catalog containing a citation to the saved draft document.
     */
    this.saveDraft = async function(draft) {
        try {
            if (debug > 1) {
                const validator = bali.validator(debug);
                validator.validateType('/bali/repositories/DocumentRepository', '$saveDraft', '$document', document, [
                    '/bali/collections/Catalog'
                ]);
            }
            const document = await notary.notarizeDocument(draft);
            return await storage.writeDraft(document);
        } catch (cause) {
            const exception = bali.exception({
                $module: '/bali/repositories/DocumentRepository',
                $procedure: '$saveDraft',
                $exception: '$unexpected',
                $draft: draft,
                $text: 'An unexpected error occurred while attempting to save a draft document.'
            }, cause);
            if (debug) console.error(exception.toString());
            throw exception;
        }
    };

    /**
     * This method attempts to retrieve the cited draft document from the document repository.
     *
     * @param {Catalog} citation A catalog containing a citation to the draft document.
     * @returns {Catalog} A catalog containing the draft document or nothing if it doesn't exist.
     */
    this.retrieveDraft = async function(citation) {
        try {
            if (debug > 1) {
                const validator = bali.validator(debug);
                validator.validateType('/bali/repositories/DocumentRepository', '$retrieveDraft', '$citation', citation, [
                    '/bali/collections/Catalog'
                ]);
            }
            const document = await storage.readDraft(citation);
            if (document) return document.getValue('$content');
        } catch (cause) {
            const exception = bali.exception({
                $module: '/bali/repositories/DocumentRepository',
                $procedure: '$retrieveDraft',
                $exception: '$unexpected',
                $citation: citation,
                $text: 'An unexpected error occurred while attempting to retrieve a draft document.'
            }, cause);
            if (debug) console.error(exception.toString());
            throw exception;
        }
    };

    /**
     * This method attempts to discard from the document repository the cited draft document.
     * If the draft document does not exist, this method does nothing.
     *
     * @param {Catalog} citation A catalog containing a document citation.
     * @returns {Boolean} Whether or not the cited draft document existed in the document repository.
     */
    this.discardDocument = async function(citation) {
        try {
            if (debug > 1) {
                const validator = bali.validator(debug);
                validator.validateType('/bali/repositories/DocumentRepository', '$discardDocument', '$citation', citation, [
                    '/bali/collections/Catalog'
                ]);
            }
            return (await storage.deleteDraft(citation) !== undefined);
        } catch (cause) {
            const exception = bali.exception({
                $module: '/bali/repositories/DocumentRepository',
                $procedure: '$discardDocument',
                $exception: '$unexpected',
                $citation: citation,
                $text: 'An unexpected error occurred while attempting to discard a draft document.'
            }, cause);
            if (debug) console.error(exception.toString());
            throw exception;
        }
    };

    /**
     * This method commits a document to the document repository under the specified name.
     *
     * @param {Name} name The name to be associated with the committed document.
     * @param {Catalog} draft A catalog containing the document to be committed.
     * @returns {Catalog} A catalog containing a citation to the committed document.
     */
    this.commitDocument = async function(name, draft) {
        try {
            if (debug > 1) {
                const validator = bali.validator(debug);
                validator.validateType('/bali/repositories/DocumentRepository', '$commitDocument', '$name', name, [
                    '/bali/elements/Name'
                ]);
                validator.validateType('/bali/repositories/DocumentRepository', '$commitDocument', '$document', document, [
                    '/bali/collections/Catalog'
                ]);
            }
            if (await storage.nameExists(name)) {
                const exception = bali.exception({
                    $module: '/bali/repositories/DocumentRepository',
                    $procedure: '$commitDocument',
                    $exception: '$nameExists',
                    $name: name,
                    $text: 'The specified name already exists in the document repository.'
                });
                throw exception;
            }
            const document = await notary.notarizeDocument(draft);
            const citation = await storage.writeDocument(document);
            return await storage.writeName(name, citation);
        } catch (cause) {
            const exception = bali.exception({
                $module: '/bali/repositories/DocumentRepository',
                $procedure: '$commitDocument',
                $exception: '$unexpected',
                $draft: draft,
                $text: 'An unexpected error occurred while attempting to commit a document.'
            }, cause);
            if (debug) console.error(exception.toString());
            throw exception;
        }
    };

    /**
     * This method attempts to retrieve the named document from the document repository.
     *
     * @param {Name} name The name of the document to be retrieved from the document repository.
     * @returns {Catalog} A catalog containing the named document or nothing if it doesn't exist.
     */
    this.retrieveDocument = async function(name) {
        try {
            if (debug > 1) {
                const validator = bali.validator(debug);
                validator.validateType('/bali/repositories/DocumentRepository', '$retrieveDocument', '$name', name, [
                    '/bali/elements/Name'
                ]);
            }
            const citation = await storage.readName(name);
            if (citation) {
                const document = await storage.readDocument(citation);
                return document.getValue('$content');
            }
        } catch (cause) {
            const exception = bali.exception({
                $module: '/bali/repositories/DocumentRepository',
                $procedure: '$retrieveDocument',
                $exception: '$unexpected',
                $name: name,
                $text: 'An unexpected error occurred while attempting to retrieve a named document.'
            }, cause);
            if (debug) console.error(exception.toString());
            throw exception;
        }
    };

    /**
     * This method checks out a new draft version of the named document from the document repository.
     * If a version level is specified, that level will be incremented by one, otherwise, the
     * largest version level will be incremented.
     *
     * @param {Name} name The name of the document to be checked out from the document repository.
     * @param {Number} level The version level to be incremented.
     * @returns {Catalog} A catalog containing the new draft version of the named document.
     */
    this.checkoutDocument = async function(name, level) {
        try {
            if (debug > 1) {
                const validator = bali.validator(debug);
                validator.validateType('/bali/repositories/DocumentRepository', '$checkoutDocument', '$name', name, [
                    '/bali/elements/Name'
                ]);
                validator.validateType('/bali/repositories/DocumentRepository', '$checkoutDocument', '$level', level, [
                    '/javascript/Number'
                ]);
            }
            const citation = await storage.readName(name);
            if (!citation) {
                const exception = bali.exception({
                    $module: '/bali/repositories/DocumentRepository',
                    $procedure: '$checkoutDocument',
                    $exception: '$unknownName',
                    $name: name,
                    $text: 'The specified name does not exist in the document repository.'
                });
                throw exception;
            }
            const document = await storage.readDocument(citation);
            const template = document.getValue('$content');
            const parameters = template.getParameters();
            parameters.setValue('$version', bali.version.nextVersion(parameters.getValue('$version'), level));
            const draft = bali.catalog(template, parameters);
            return draft;
        } catch (cause) {
            const exception = bali.exception({
                $module: '/bali/repositories/DocumentRepository',
                $procedure: '$checkoutDocument',
                $exception: '$unexpected',
                $name: name,
                $text: 'An unexpected error occurred while attempting to checkout a named document.'
            }, cause);
            if (debug) console.error(exception.toString());
            throw exception;
        }
    };

    /**
     * This method creates in the document repository a new message bag with the specified
     * attributes.
     *
     * @param {Name} name The name of the message bag to be created.
     * @param {Name} permissions The permissions controlling the access to the new message bag.
     * @param {Number} capacity The maximum number of messages allowed in the message bag.
     * @param {Number} lease The number of seconds a borrowed message's lease expires and it is
     * once again made available for processing by another process. Note: to avoid possible
     * collisions by multiple processes, the version number of a message whose lease has expired
     * will be incremented by one.
     */
    this.createBag = async function(name, permissions, capacity, lease) {
        try {
            if (debug > 1) {
                const validator = bali.validator(debug);
                validator.validateType('/bali/repositories/DocumentRepository', '$createBag', '$name', name, [
                    '/bali/elements/Name'
                ]);
                validator.validateType('/bali/repositories/DocumentRepository', '$createBag', '$permissions', permissions, [
                    '/bali/elements/Name'
                ]);
                validator.validateType('/bali/repositories/DocumentRepository', '$createBag', '$capacity', capacity, [
                    '/javascript/Undefined',
                    '/javascript/Number'
                ]);
                validator.validateType('/bali/repositories/DocumentRepository', '$createBag', '$lease', lease, [
                    '/javascript/Undefined',
                    '/javascript/Number'
                ]);
            }
            capacity = capacity || 10;  // default capacity
            lease = lease || 60;  // default to one minute
            const bag = bali.catalog({
                $capacity: capacity,
                $lease: lease
            }, {
                $type: '/bali/repositories/Bag/v1',
                $tag: bali.tag(),
                $version: bali.version(),
                $permissions: permissions,
                $previous: 'none'
            });
            const document = await notary.notarizeDocument(bag);
            const citation = await storage.writeDocument(document);
            await storage.writeName(name, citation);
        } catch (cause) {
            const exception = bali.exception({
                $module: '/bali/repositories/DocumentRepository',
                $procedure: '$createDocument',
                $exception: '$unexpected',
                $name: name,
                $permissions: permissions,
                $capacity: capacity,
                $lease: lease,
                $text: 'An unexpected error occurred while attempting to create a new message bag.'
            }, cause);
            if (debug) console.error(exception.toString());
            throw exception;
        }
    };

    /**
     * This method determines the current number of messages that are available for processing in
     * the specified message bag in the document repository.
     *
     * @param {Name} bag The name of the bag in the document repository.
     * @returns {Number} The number of messages that are currently in the message bag.
     */
    this.messageCount = async function(bag) {
        try {
            if (debug > 1) {
                const validator = bali.validator(debug);
                validator.validateType('/bali/repositories/DocumentRepository', '$borrowMessage', '$bag', bag, [
                    '/bali/elements/Name'
                ]);
            }
            const citation = await storage.readName(bag);
            return await storage.messageCount(citation);
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
     *
     * @param {Name} bag The name of the bag in the document repository.
     * @param {Catalog} message A catalog containing the message to be added.
     * @returns {Tag} A tag identifying the newly added message.
     */
    this.addMessage = async function(bag, message) {
        try {
            if (debug > 1) {
                const validator = bali.validator(debug);
                validator.validateType('/bali/repositories/DocumentRepository', '$addMessage', '$bag', bag, [
                    '/bali/elements/Name'
                ]);
                validator.validateType('/bali/repositories/DocumentRepository', '$addMessage', '$message', message, [
                    '/bali/collections/Catalog'
                ]);
            }
            const citation = await storage.readName(bag);
            const catalog = bali.catalog(message, {
                $type: '/bali/repositories/Message/v1',
                $tag: bali.tag(),
                $version: bali.version(),
                $permissions: '/bali/permissions/public/v1',
                $previous: 'none'
            });
            const document = await notary.notarizeDocument(catalog);
            return await storage.addMessage(citation, document);
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
     * document repository. The removed message will not be available to other clients for one
     * minute. If the client that borrowed the message does not call <code>deleteMessage()</code>
     * within that time, the message is automatically added back into the bag for other clients
     * to process. If the bag is empty, nothing is returned.
     *
     * @param {Name} bag The name of the bag in the document repository.
     * @returns {Catalog} A catalog containing the message or nothing if the bag is empty.
     */
    this.borrowMessage = async function(bag) {
        try {
            if (debug > 1) {
                const validator = bali.validator(debug);
                validator.validateType('/bali/repositories/DocumentRepository', '$borrowMessage', '$bag', bag, [
                    '/bali/elements/Name'
                ]);
            }
            const citation = await storage.readName(bag);
            const message = await storage.borrowMessage(citation);
            if (message) return message.getValue('$content');
        } catch (cause) {
            const exception = bali.exception({
                $module: '/bali/repositories/DocumentRepository',
                $procedure: '$borrowMessage',
                $exception: '$unexpected',
                $bag: bag,
                $text: 'An unexpected error occurred while attempting to remove a message.'
            }, cause);
            if (debug) console.error(exception.toString());
            throw exception;
        }
    };

    /**
     * This method returns an existing message to the specified bag in the document repository.
     * It should be called when the client that removed the message determines that it cannot
     * successfully process the message. The returned message is then available to other clients
     * for processing. Any changes to the state of the message will be reflected in the updated
     * message.
     *
     * @param {Name} bag The name of the bag in the document repository.
     * @param {Catalog} message A catalog containing the message being returned.
     * @returns {Boolean} Whether or not the message was successfully returned.
     */
    this.returnMessage = async function(bag, message) {
        try {
            if (debug > 1) {
                const validator = bali.validator(debug);
                validator.validateType('/bali/repositories/DocumentRepository', '$returnMessage', '$bag', bag, [
                    '/bali/elements/Name'
                ]);
                validator.validateType('/bali/repositories/DocumentRepository', '$returnMessage', '$message', message, [
                    '/bali/collections/Catalog'
                ]);
            }
            const citation = await storage.readName(bag);
            const document = await notary.notarizeDocument(message);
            return await storage.returnMessage(citation, document);
        } catch (cause) {
            const exception = bali.exception({
                $module: '/bali/repositories/DocumentRepository',
                $procedure: '$returnMessage',
                $exception: '$unexpected',
                $bag: bag,
                $message: message,
                $text: 'An unexpected error occurred while attempting to return a message to a bag.'
            }, cause);
            if (debug) console.error(exception.toString());
            throw exception;
        }
    };

    /**
     * This method permanently deletes a message from the specified bag in the document repository.
     * It should be called once the processing of the message has successfully completed.
     *
     * @param {Name} bag The name of the bag in the document repository.
     * @param {Catalog} message A catalog containing the message being returned.
     * @returns {Boolean} Whether or not the specified message still existed.
     */
    this.deleteMessage = async function(bag, message) {
        try {
            if (debug > 1) {
                const validator = bali.validator(debug);
                validator.validateType('/bali/repositories/DocumentRepository', '$deleteMessage', '$bag', bag, [
                    '/bali/elements/Name'
                ]);
                validator.validateType('/bali/repositories/DocumentRepository', '$deleteMessage', '$message', message, [
                    '/bali/collections/Catalog'
                ]);
            }
            const citation = await storage.readName(bag);
            const tag = message.getParameter('$tag');
            return await storage.deleteMessage(citation, tag);
        } catch (cause) {
            const exception = bali.exception({
                $module: '/bali/repositories/DocumentRepository',
                $procedure: '$deleteMessage',
                $exception: '$unexpected',
                $bag: bag,
                $message: message,
                $text: 'An unexpected error occurred while attempting to delete a message from a bag.'
            }, cause);
            if (debug) console.error(exception.toString());
            throw exception;
        }
    };

    return this;
};
DocumentRepository.prototype.constructor = DocumentRepository;
exports.DocumentRepository = DocumentRepository;
