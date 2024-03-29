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
const bali = require('bali-component-framework').api();


// REPOSITORY API

/**
 * This function creates a new instance of a document repository.
 *
 * @param {DigitalNotary} notary The digital notary to be used to notarize the documents.
 * @param {Object} storage The storage mechanism to be used to maintain the documents.
 * @param {Boolean|Number} debug An optional number in the range 0..3 that controls the level of
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
    this.debug = debug || 0;  // default is off

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
     * @returns {Catalog} A catalog containing the new document.
     */
    this.createDocument = async function(type, permissions, template) {
        try {
            if (this.debug > 1) {
                bali.component.validateArgument('/bali/repositories/DocumentRepository', '$createDocument', '$type', type, [
                    '/javascript/String',
                    '/bali/strings/Name'
                ]);
                bali.component.validateArgument('/bali/repositories/DocumentRepository', '$createDocument', '$permissions', permissions, [
                    '/javascript/String',
                    '/bali/strings/Name'
                ]);
                bali.component.validateArgument('/bali/repositories/DocumentRepository', '$createDocument', '$template', template, [
                    '/javascript/Undefined',
                    '/javascript/Array',
                    '/javascript/Object',
                    '/bali/interfaces/Sequential'
                ]);
            }
            const document = bali.instance(type, template);
            document.setParameter('$permissions', permissions);
            return document;
        } catch (cause) {
            const exception = bali.exception({
                $module: '/bali/repositories/DocumentRepository',
                $procedure: '$createDocument',
                $exception: '$unexpected',
                $type: type,
                $permissions: permissions,
                $template: template,
                $text: 'An unexpected error occurred while attempting to create a document of a given type.'
            }, cause);
            if (this.debug) console.error(exception.toString());
            throw exception;
        }
    };

    /**
     * This method saves a document in the document repository. If a document with
     * the same tag and version already exists in the document repository, it is overwritten with
     * the new document. If not, a new document is created in the document repository.
     *
     * @param {Catalog} document A catalog containing the document.
     * @returns {Catalog} A catalog containing a citation to the saved document.
     */
    this.saveDocument = async function(document) {
        try {
            if (this.debug > 1) {
                bali.component.validateArgument('/bali/repositories/DocumentRepository', '$saveDocument', '$document', document, [
                    '/bali/collections/Catalog'
                ]);
            }
            const citation = await storage.writeDocument(document);
            return citation;
        } catch (cause) {
            const exception = bali.exception({
                $module: '/bali/repositories/DocumentRepository',
                $procedure: '$saveDocument',
                $exception: '$unexpected',
                $document: document,
                $text: 'An unexpected error occurred while attempting to save a document.'
            }, cause);
            if (this.debug) console.error(exception.toString());
            throw exception;
        }
    };

    /**
     * This method attempts to retrieve a document from the document repository.
     *
     * @param {Catalog} citation A catalog containing a citation to the document.
     * @returns {Catalog} A catalog containing the document or nothing if it doesn't exist.
     */
    this.retrieveDocument = async function(citation) {
        try {
            if (this.debug > 1) {
                bali.component.validateArgument('/bali/repositories/DocumentRepository', '$retrieveDocument', '$citation', citation, [
                    '/bali/collections/Catalog'
                ]);
            }
            const document = await storage.readDocument(citation);
            return document;
        } catch (cause) {
            const exception = bali.exception({
                $module: '/bali/repositories/DocumentRepository',
                $procedure: '$retrieveDocument',
                $exception: '$unexpected',
                $citation: citation,
                $text: 'An unexpected error occurred while attempting to retrieve a document.'
            }, cause);
            if (this.debug) console.error(exception.toString());
            throw exception;
        }
    };

    /**
     * This method attempts to discard from the document repository the cited document.
     * If the document does not exist, this method does nothing.
     *
     * @param {Catalog} citation A catalog containing a document citation.
     * @returns {Boolean} Whether or not the cited document existed in the document repository.
     */
    this.discardDocument = async function(citation) {
        try {
            if (this.debug > 1) {
                bali.component.validateArgument('/bali/repositories/DocumentRepository', '$discardDocument', '$citation', citation, [
                    '/bali/collections/Catalog'
                ]);
            }
            const document = await storage.deleteDocument(citation);
            return document !== undefined;
        } catch (cause) {
            const exception = bali.exception({
                $module: '/bali/repositories/DocumentRepository',
                $procedure: '$discardDocument',
                $exception: '$unexpected',
                $citation: citation,
                $text: 'An unexpected error occurred while attempting to discard a document.'
            }, cause);
            if (this.debug) console.error(exception.toString());
            throw exception;
        }
    };

    /**
     * This method notarizes the specified document and saves it as a new contract in the
     * document repository under the specified name. Any draft of the document is removed
     * from the document repository. If the named contract already exists and exception
     * is thrown since contracts are immutable.
     *
     * @param {Name} name The name to be associated with the new contract.
     * @param {Catalog} document A catalog containing the document to be notarized.
     * @returns {Catalog} A catalog containing the newly signed contract.
     */
    this.signContract = async function(name, document) {
        try {
            if (this.debug > 1) {
                bali.component.validateArgument('/bali/repositories/DocumentRepository', '$signContract', '$name', name, [
                    '/javascript/String',
                    '/bali/strings/Name'
                ]);
                bali.component.validateArgument('/bali/repositories/DocumentRepository', '$signContract', '$document', document, [
                    '/bali/collections/Catalog'
                ]);
            }
            if (await storage.nameExists(name)) {
                const exception = bali.exception({
                    $module: '/bali/repositories/DocumentRepository',
                    $procedure: '$signContract',
                    $exception: '$nameExists',
                    $name: name,
                    $text: 'The specified name already exists in the document repository.'
                });
                throw exception;
            }
            const contract = await notary.notarizeDocument(document);
            const citation = await storage.writeContract(contract);
            await storage.writeName(name, citation);
            return contract;
        } catch (cause) {
            const exception = bali.exception({
                $module: '/bali/repositories/DocumentRepository',
                $procedure: '$signContract',
                $exception: '$unexpected',
                $document: document,
                $text: 'An unexpected error occurred while attempting to sign a contract.'
            }, cause);
            if (this.debug) console.error(exception.toString());
            throw exception;
        }
    };

    /**
     * This method attempts to retrieve the named contract from the document repository.
     *
     * @param {Name} name The name of the contract to be retrieved from the document repository.
     * @returns {Catalog} A catalog containing the named contract or nothing if it doesn't exist.
     */
    this.retrieveContract = async function(name) {
        try {
            if (this.debug > 1) {
                bali.component.validateArgument('/bali/repositories/DocumentRepository', '$retrieveContract', '$name', name, [
                    '/javascript/String',
                    '/bali/strings/Name'
                ]);
            }
            const citation = await storage.readName(name);
            if (citation) {
                const contract = await storage.readContract(citation);
                return contract;
            }
        } catch (cause) {
            const exception = bali.exception({
                $module: '/bali/repositories/DocumentRepository',
                $procedure: '$retrieveContract',
                $exception: '$unexpected',
                $name: name,
                $text: 'An unexpected error occurred while attempting to retrieve a named contract.'
            }, cause);
            if (this.debug) console.error(exception.toString());
            throw exception;
        }
    };

    /**
     * This method checks out a new version of the named contract from the document repository.
     * If a version level is specified, that level will be incremented by one, otherwise, the
     * largest version level will be incremented.
     *
     * @param {Name} name The name of the contract to be checked out from the document repository.
     * @param {Number} level The version level to be incremented.
     * @returns {Catalog} A catalog containing the new version of the named contract.
     */
    this.checkoutContract = async function(name, level) {
        try {
            if (this.debug > 1) {
                bali.component.validateArgument('/bali/repositories/DocumentRepository', '$checkoutContract', '$name', name, [
                    '/javascript/String',
                    '/bali/strings/Name'
                ]);
                bali.component.validateArgument('/bali/repositories/DocumentRepository', '$checkoutContract', '$level', level, [
                    '/javascript/Number'
                ]);
            }
            const citation = await storage.readName(name);
            if (!citation) {
                const exception = bali.exception({
                    $module: '/bali/repositories/DocumentRepository',
                    $procedure: '$checkoutContract',
                    $exception: '$unknownName',
                    $name: name,
                    $text: 'The specified name does not exist in the document repository.'
                });
                throw exception;
            }
            const contract = await storage.readContract(citation);
            const template = contract.getAttribute('$document');
            const parameters = template.getParameters();
            parameters.setAttribute('$version', bali.version.nextVersion(parameters.getAttribute('$version'), level));
            parameters.setAttribute('$previous', citation);
            const document = bali.catalog(template, parameters);
            return document;
        } catch (cause) {
            const exception = bali.exception({
                $module: '/bali/repositories/DocumentRepository',
                $procedure: '$checkoutContract',
                $exception: '$unexpected',
                $name: name,
                $text: 'An unexpected error occurred while attempting to checkout a named contract.'
            }, cause);
            if (this.debug) console.error(exception.toString());
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
     * @param {Number} lease The number of seconds a received message's lease expires and it is
     * once again made available for processing by another process. Note: to avoid possible
     * collisions by multiple processes, the version number of a message whose lease has expired
     * will be incremented by one.
     */
    this.createBag = async function(name, permissions, capacity, lease) {
        try {
            if (this.debug > 1) {
                bali.component.validateArgument('/bali/repositories/DocumentRepository', '$createBag', '$name', name, [
                    '/javascript/String',
                    '/bali/strings/Name'
                ]);
                bali.component.validateArgument('/bali/repositories/DocumentRepository', '$createBag', '$permissions', permissions, [
                    '/javascript/String',
                    '/bali/strings/Name'
                ]);
                bali.component.validateArgument('/bali/repositories/DocumentRepository', '$createBag', '$capacity', capacity, [
                    '/javascript/Undefined',
                    '/javascript/Number'
                ]);
                bali.component.validateArgument('/bali/repositories/DocumentRepository', '$createBag', '$lease', lease, [
                    '/javascript/Undefined',
                    '/javascript/Number'
                ]);
            }
            capacity = capacity || 10;  // default capacity
            lease = lease || 60;  // default to one minute
            const document = await this.createDocument('/nebula/repositories/Bag/v1', permissions, {
                $capacity: capacity,
                $lease: lease
            });
            const contract = await notary.notarizeDocument(document);
            const citation = await storage.writeContract(contract);
            await storage.writeName(name, citation);
        } catch (cause) {
            const exception = bali.exception({
                $module: '/bali/repositories/DocumentRepository',
                $procedure: '$createBag',
                $exception: '$unexpected',
                $name: name,
                $permissions: permissions,
                $capacity: capacity,
                $lease: lease,
                $text: 'An unexpected error occurred while attempting to create a new message bag.'
            }, cause);
            if (this.debug) console.error(exception.toString());
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
            if (this.debug > 1) {
                bali.component.validateArgument('/bali/repositories/DocumentRepository', '$messageCount', '$bag', bag, [
                    '/javascript/String',
                    '/bali/strings/Name'
                ]);
            }
            const citation = await storage.readName(bag);
            const count = await storage.messageCount(citation);
            return count;
        } catch (cause) {
            const exception = bali.exception({
                $module: '/bali/repositories/DocumentRepository',
                $procedure: '$messageCount',
                $exception: '$unexpected',
                $bag: bag,
                $text: 'An unexpected error occurred while attempting to check the number of messages that are in a bag.'
            }, cause);
            if (this.debug) console.error(exception.toString());
            throw exception;
        }
    };

    /**
     * This method posts a new message into the specified bag in the document repository.
     *
     * @param {Name} bag The name of the bag in the document repository.
     * @param {Catalog} message A catalog containing the message to be posted.
     */
    this.postMessage = async function(bag, message) {
        try {
            if (this.debug > 1) {
                bali.component.validateArgument('/bali/repositories/DocumentRepository', '$postMessage', '$bag', bag, [
                    '/javascript/String',
                    '/bali/strings/Name'
                ]);
                bali.component.validateArgument('/bali/repositories/DocumentRepository', '$postMessage', '$message', message, [
                    '/bali/collections/Catalog'
                ]);
            }
            const citation = await storage.readName(bag);
            if (!citation) {
                const exception = bali.exception({
                    $module: '/bali/repositories/DocumentRepository',
                    $procedure: '$postMessage',
                    $exception: '$unknownBag',
                    $bag: bag,
                    $text: 'The specified bag does not exist in the document repository.'
                });
                throw exception;
            }
            const contract = await storage.readContract(citation);
            const capacity = contract.getAttribute('$document').getAttribute('$capacity');
            const size = await storage.messageCount(citation);
            if (size >= capacity) {
                const exception = bali.exception({
                    $module: '/bali/repositories/DocumentRepository',
                    $procedure: '$postMessage',
                    $exception: '$atCapacity',
                    $bag: bag,
                    $text: 'The specified bag is at full capacity and cannot handle any more messages.'
                });
                throw exception;
            }
            const document = bali.instance('/nebula/repositories/Message/v1', message);
            document.setAttribute('$bag', bag);
            await storage.addMessage(citation, document);
        } catch (cause) {
            const exception = bali.exception({
                $module: '/bali/repositories/DocumentRepository',
                $procedure: '$postMessage',
                $exception: '$unexpected',
                $bag: bag,
                $message: message,
                $text: 'An unexpected error occurred while attempting to post a message.'
            }, cause);
            if (this.debug) console.error(exception.toString());
            throw exception;
        }
    };

    /**
     * This method randomly selects a message from the specified bag in the document repository.
     * The selected message will not be available to other clients for the lease time specified
     * in the bag definition. If the client that received the message does not call
     * <code>acceptMessage()</code> within that time, the message is automatically added back
     * into the bag for other clients to receive. If the bag is empty, nothing is returned.
     *
     * @param {Name} bag The name of the bag in the document repository.
     * @returns {Catalog} A catalog containing the message or nothing if the bag is empty.
     */
    this.retrieveMessage = async function(bag) {
        try {
            if (this.debug > 1) {
                bali.component.validateArgument('/bali/repositories/DocumentRepository', '$retrieveMessage', '$bag', bag, [
                    '/javascript/String',
                    '/bali/strings/Name'
                ]);
            }
            const citation = await storage.readName(bag);
            const message = await storage.removeMessage(citation);
            return message;
        } catch (cause) {
            const exception = bali.exception({
                $module: '/bali/repositories/DocumentRepository',
                $procedure: '$retrieveMessage',
                $exception: '$unexpected',
                $bag: bag,
                $text: 'An unexpected error occurred while attempting to receive a message.'
            }, cause);
            if (this.debug) console.error(exception.toString());
            throw exception;
        }
    };

    /**
     * This method returns a previously received message to its original bag in the document
     * repository.  It should be called when the client that received the message determines that
     * it cannot successfully process it. The rejected message is then available to other clients
     * for processing. Any changes to the state of the message will be reflected in the updated
     * message.
     *
     * @param {Catalog} message A catalog containing the message being returned.
     */
    this.rejectMessage = async function(message) {
        try {
            if (this.debug > 1) {
                bali.component.validateArgument('/bali/repositories/DocumentRepository', '$rejectMessage', '$message', message, [
                    '/bali/collections/Catalog'
                ]);
            }
            const bag = message.getAttribute('$bag');
            const citation = await storage.readName(bag);
            await storage.returnMessage(citation, message);
        } catch (cause) {
            const exception = bali.exception({
                $module: '/bali/repositories/DocumentRepository',
                $procedure: '$rejectMessage',
                $exception: '$unexpected',
                $message: message,
                $text: 'An unexpected error occurred while attempting to reject a message.'
            }, cause);
            if (this.debug) console.error(exception.toString());
            throw exception;
        }
    };

    /**
     * This method permanently removes a previously received message from its original bag in the
     * document repository.  It should be called once the processing of the message has completed
     * successfully.
     *
     * @param {Catalog} message A catalog containing the message being accepted.
     */
    this.acceptMessage = async function(message) {
        try {
            if (this.debug > 1) {
                bali.component.validateArgument('/bali/repositories/DocumentRepository', '$acceptMessage', '$message', message, [
                    '/bali/collections/Catalog'
                ]);
            }
            const bag = await storage.readName(message.getAttribute('$bag'));
            const citation = await notary.citeDocument(message);
            await storage.deleteMessage(bag, citation);
        } catch (cause) {
            const exception = bali.exception({
                $module: '/bali/repositories/DocumentRepository',
                $procedure: '$acceptMessage',
                $exception: '$unexpected',
                $message: message,
                $text: 'An unexpected error occurred while attempting to accept a message.'
            }, cause);
            if (this.debug) console.error(exception.toString());
            throw exception;
        }
    };

    /**
     *
     * This method publishes the specified event to the notification bag in the document repository.
     *
     * @param {Catalog} event A catalog containing the event to be added.
     */
    this.publishEvent = async function(event) {
        const bag = bali.name(['nebula', 'events', 'bag', 'v1']);
        try {
            if (this.debug > 1) {
                bali.component.validateArgument('/bali/repositories/DocumentRepository', '$publishEvent', '$event', event, [
                    '/bali/collections/Catalog'
                ]);
            }
            const citation = await storage.readName(bag);
            const message = bali.instance('/nebula/repositories/Event/v1', event);
            await storage.addMessage(citation, message);
        } catch (cause) {
            const exception = bali.exception({
                $module: '/bali/repositories/DocumentRepository',
                $procedure: '$publishEvent',
                $exception: '$unexpected',
                $bag: bag,
                $event: event,
                $text: 'An unexpected error occurred while attempting to publish an event.'
            }, cause);
            if (this.debug) console.error(exception.toString());
            throw exception;
        }
    };

    return this;
};
DocumentRepository.prototype.constructor = DocumentRepository;
exports.DocumentRepository = DocumentRepository;
