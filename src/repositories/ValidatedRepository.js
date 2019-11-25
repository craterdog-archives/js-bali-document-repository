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
 * This class implements a document repository wrapper that validates all documents prior to
 * storing them in the wrapped document repository and after retrieving them from the wrapped
 * document repository.  The documents are validated using the public certificate of the
 * notary key used to notarize them.
 */
const bali = require('bali-component-framework').api();


// PRIVATE CONSTANTS

// the POSIX end of line character
const EOL = '\n';


// PUBLIC FUNCTIONS

/**
 * This function creates a new instance of a cached document repository.  A remote repository
 * is passed in and is used as the persistent store for all documents.
 * 
 * @param {DigitalNotary} notary The digital notary to be used to validate the notary seals.
 * @param {Object} repository The actual repository that maintains documents.
 * @param {Boolean|Number} debug An optional number in the range [0..3] that controls the level of
 * debugging that occurs:
 * <pre>
 *   0 (or false): no logging
 *   1 (or true): log exceptions to console.error
 *   2: perform argument validation and log exceptions to console.error
 *   3: perform argument validation and log exceptions to console.error and debug info to console.log
 * </pre>
 * @returns {Object} The new cached document repository.
 */
const ValidatedRepository = function(notary, repository, debug) {
    // validate the arguments
    if (debug === null || debug === undefined) debug = 0;  // default is off
    if (debug > 1) {
        const validator = bali.validator(debug);
        validator.validateType('/bali/repositories/ValidatedRepository', '$ValidatedRepository', '$notary', notary, [
            '/javascript/Object'
        ]);
        validator.validateType('/bali/repositories/ValidatedRepository', '$ValidatedRepository', '$repository', repository, [
            '/javascript/Object'
        ]);
    }

    /**
     * This function returns a string providing attributes about this repository.
     * 
     * @returns {String} A string providing attributes about this repository.
     */
    this.toString = function() {
        const catalog = bali.catalog({
            $module: '/bali/repositories/ValidatedRepository',
            $url: this.getURI()
        });
        return catalog.toString();
    };

    /**
     * This function returns a reference to this document repository.
     * 
     * @returns {Reference} A reference to this document repository.
     */
    this.getURI = function() {
        try {
            return repository.getURI();
        } catch (cause) {
            const exception = bali.exception({
                $module: '/bali/repositories/ValidatedRepository',
                $procedure: '$getURI',
                $exception: '$unexpected',
                $text: 'An unexpected error occurred while attempting to retrieve the URI for the repository.'
            }, cause);
            if (debug) console.error(exception.toString());
            throw exception;
        }
    };

    /**
     * This function checks to see whether or not a document citation is associated
     * with the specified name.
     * 
     * @param {String} name The unique name for the document citation being checked.
     * @returns {Boolean} Whether or not the document citation exists.
     */
    this.citationExists = async function(name) {
        try {
            // validate the arguments
            if (debug > 1) {
                const validator = bali.validator(debug);
                validator.validateType('/bali/repositories/ValidatedRepository', '$citationExists', '$name', name, [
                    '/javascript/String'
                ]);
            }

            // check for existence
            return await repository.citationExists(name);

        } catch (cause) {
            const exception = bali.exception({
                $module: '/bali/repositories/ValidatedRepository',
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
     * This function attempts to retrieve a document citation from the repository for
     * the specified name.
     * 
     * @param {String} name The unique name for the document citation being fetched.
     * @returns {Catalog} A catalog containing the document citation or <code>undefined</code>
     * if it doesn't exist.
     */
    this.fetchCitation = async function(name) {
        try {
            // validate the arguments
            if (debug > 1) {
                const validator = bali.validator(debug);
                validator.validateType('/bali/repositories/ValidatedRepository', '$fetchCitation', '$name', name, [
                    '/javascript/String'
                ]);
            }

            // fetch the citation
            const citation = await repository.fetchCitation(name);
            await validateCitation(notary, repository, citation, debug);

            return citation;
        } catch (cause) {
            const exception = bali.exception({
                $module: '/bali/repositories/ValidatedRepository',
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
     * This function associates a new name with the specified document citation in
     * the repository.
     * 
     * @param {String} name The unique name for the specified document citation.
     * @param {Catalog} citation A catalog containing the document citation.
     */
    this.createCitation = async function(name, citation) {
        try {
            // validate the arguments
            if (debug > 1) {
                const validator = bali.validator(debug);
                validator.validateType('/bali/repositories/ValidatedRepository', '$createCitation', '$name', name, [
                    '/javascript/String'
                ]);
                validator.validateType('/bali/repositories/ValidatedRepository', '$createCitation', '$citation', citation, [
                    '/bali/collections/Catalog'
                ]);
            }

            // create the new citation
            await repository.createCitation(name, citation);

        } catch (cause) {
            const exception = bali.exception({
                $module: '/bali/repositories/ValidatedRepository',
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
     * This function checks to see whether or not a draft document is associated with the
     * specified identifier.
     * 
     * @param {String} draftId The unique identifier (including version number) for
     * the draft document being checked.
     * @returns {Boolean} Whether or not the draft document exists.
     */
    this.draftExists = async function(draftId) {
        try {
            // validate the arguments
            if (debug > 1) {
                const validator = bali.validator(debug);
                validator.validateType('/bali/repositories/ValidatedRepository', '$draftExists', '$draftId', draftId, [
                    '/javascript/String'
                ]);
            }

            // check for existence
            return await repository.draftExists(draftId);

        } catch (cause) {
            const exception = bali.exception({
                $module: '/bali/repositories/ValidatedRepository',
                $procedure: '$draftExists',
                $exception: '$unexpected',
                $draftId: draftId,
                $text: 'An unexpected error occurred while attempting to verify the existence of a draft.'
            }, cause);
            if (debug) console.error(exception.toString());
            throw exception;
        }
    };

    /**
     * This function attempts to retrieve the specified draft document from the repository.
     * 
     * @param {String} draftId The unique identifier (including version number) for
     * the draft document being fetched.
     * @returns {Catalog} A catalog containing the draft or <code>undefined</code>
     * if it doesn't exist.
     */
    this.fetchDraft = async function(draftId) {
        try {
            // validate the arguments
            if (debug > 1) {
                const validator = bali.validator(debug);
                validator.validateType('/bali/repositories/ValidatedRepository', '$fetchDraft', '$draftId', draftId, [
                    '/javascript/String'
                ]);
            }

            // fetch the draft document
            const draft = await repository.fetchDraft(draftId);
            await validateDocument(notary, repository, draft, debug);

            return draft;
        } catch (cause) {
            const exception = bali.exception({
                $module: '/bali/repositories/ValidatedRepository',
                $procedure: '$fetchDraft',
                $exception: '$unexpected',
                $draftId: draftId,
                $text: 'An unexpected error occurred while attempting to fetch a draft.'
            }, cause);
            if (debug) console.error(exception.toString());
            throw exception;
        }
    };

    /**
     * This function saves a draft document in the repository.
     * 
     * @param {String} draftId The unique identifier (including version number) for
     * the draft document being saved.
     * @param {Catalog} draft A catalog containing the draft document.
     */
    this.saveDraft = async function(draftId, draft) {
        try {
            // validate the arguments
            if (debug > 1) {
                const validator = bali.validator(debug);
                validator.validateType('/bali/repositories/ValidatedRepository', '$saveDraft', '$draftId', draftId, [
                    '/javascript/String'
                ]);
                validator.validateType('/bali/repositories/ValidatedRepository', '$saveDraft', '$draft', draft, [
                    '/bali/collections/Catalog'
                ]);
            }

            // save the draft document
            await validateDocument(notary, repository, draft, debug);
            await repository.saveDraft(draftId, draft);

        } catch (cause) {
            const exception = bali.exception({
                $module: '/bali/repositories/ValidatedRepository',
                $procedure: '$saveDraft',
                $exception: '$unexpected',
                $draftId: draftId,
                $draft: draft,
                $text: 'An unexpected error occurred while attempting to save a draft.'
            }, cause);
            if (debug) console.error(exception.toString());
            throw exception;
        }
    };

    /**
     * This function attempts to delete the specified draft document from the repository.
     * 
     * @param {String} draftId The unique identifier (including version number) for
     * the draft document being deleted.
     */
    this.deleteDraft = async function(draftId) {
        try {
            // validate the arguments
            if (debug > 1) {
                const validator = bali.validator(debug);
                validator.validateType('/bali/repositories/ValidatedRepository', '$deleteDraft', '$draftId', draftId, [
                    '/javascript/String'
                ]);
            }

            // delete the draft document
            await repository.deleteDraft(draftId);

        } catch (cause) {
            const exception = bali.exception({
                $module: '/bali/repositories/ValidatedRepository',
                $procedure: '$deleteDraft',
                $exception: '$unexpected',
                $draftId: draftId,
                $text: 'An unexpected error occurred while attempting to delete a draft.'
            }, cause);
            if (debug) console.error(exception.toString());
            throw exception;
        }
    };

    /**
     * This function checks to see whether or not a document is associated with the
     * specified identifier.
     * 
     * @param {String} documentId The unique identifier (including version number) for
     * the document being checked.
     * @returns {Boolean} Whether or not the document exists.
     */
    this.documentExists = async function(documentId) {
        try {
            // validate the arguments
            if (debug > 1) {
                const validator = bali.validator(debug);
                validator.validateType('/bali/repositories/ValidatedRepository', '$documentExists', '$documentId', documentId, [
                    '/javascript/String'
                ]);
            }

            // check for existence
            return await repository.documentExists(documentId);

        } catch (cause) {
            const exception = bali.exception({
                $module: '/bali/repositories/ValidatedRepository',
                $procedure: '$documentExists',
                $exception: '$unexpected',
                $documentId: documentId,
                $text: 'An unexpected error occurred while attempting to verify the existence of a document.'
            }, cause);
            if (debug) console.error(exception.toString());
            throw exception;
        }
    };

    /**
     * This function attempts to retrieve the specified document from the repository.
     * 
     * @param {String} documentId The unique identifier (including version number) for
     * the document being fetched.
     * @returns {Catalog} A catalog containing the document or <code>undefined</code>
     * if it doesn't exist.
     */
    this.fetchDocument = async function(documentId) {
        try {
            // validate the arguments
            if (debug > 1) {
                const validator = bali.validator(debug);
                validator.validateType('/bali/repositories/ValidatedRepository', '$fetchDocument', '$documentId', documentId, [
                    '/javascript/String'
                ]);
            }

            // fetch the document
            const document = await repository.fetchDocument(documentId);
            await validateDocument(notary, repository, document, debug);

            return document;
        } catch (cause) {
            const exception = bali.exception({
                $module: '/bali/repositories/ValidatedRepository',
                $procedure: '$fetchDocument',
                $exception: '$unexpected',
                $documentId: documentId,
                $text: 'An unexpected error occurred while attempting to fetch a document.'
            }, cause);
            if (debug) console.error(exception.toString());
            throw exception;
        }
    };

    /**
     * This function creates a new document in the repository.
     * 
     * @param {String} documentId The unique identifier (including version number) for
     * the document being created.
     * @param {Catalog} document A catalog containing the document.
     */
    this.createDocument = async function(documentId, document) {
        try {
            // validate the arguments
            if (debug > 1) {
                const validator = bali.validator(debug);
                validator.validateType('/bali/repositories/ValidatedRepository', '$createDocument', '$documentId', documentId, [
                    '/javascript/String'
                ]);
                validator.validateType('/bali/repositories/ValidatedRepository', '$createDocument', '$document', document, [
                    '/bali/collections/Catalog'
                ]);
            }

            // create the new document
            await validateDocument(notary, repository, document, debug);
            await repository.createDocument(documentId, document);

        } catch (cause) {
            const exception = bali.exception({
                $module: '/bali/repositories/ValidatedRepository',
                $procedure: '$createDocument',
                $exception: '$unexpected',
                $documentId: documentId,
                $document: document,
                $text: 'An unexpected error occurred while attempting to create a document.'
            }, cause);
            if (debug) console.error(exception.toString());
            throw exception;
        }
    };

    /**
     * This function checks to see whether or not a type is associated with the
     * specified identifier.
     * 
     * @param {String} typeId The unique identifier (including version number) for
     * the type being checked.
     * @returns {Boolean} Whether or not the type exists.
     */
    this.typeExists = async function(typeId) {
        try {
            // validate the arguments
            if (debug > 1) {
                const validator = bali.validator(debug);
                validator.validateType('/bali/repositories/ValidatedRepository', '$typeExists', '$typeId', typeId, [
                    '/javascript/String'
                ]);
            }

            // check for existence
            return await repository.typeExists(typeId);

        } catch (cause) {
            const exception = bali.exception({
                $module: '/bali/repositories/ValidatedRepository',
                $procedure: '$typeExists',
                $exception: '$unexpected',
                $typeId: typeId,
                $text: 'An unexpected error occurred while attempting to verify the existence of a type.'
            }, cause);
            if (debug) console.error(exception.toString());
            throw exception;
        }
    };

    /**
     * This function attempts to retrieve the specified type from the repository.
     * 
     * @param {String} typeId The unique identifier (including version number) for
     * the type being fetched.
     * @returns {Catalog} A catalog containing the type or <code>undefined</code>
     * if it doesn't exist.
     */
    this.fetchType = async function(typeId) {
        try {
            // validate the arguments
            if (debug > 1) {
                const validator = bali.validator(debug);
                validator.validateType('/bali/repositories/ValidatedRepository', '$fetchType', '$typeId', typeId, [
                    '/javascript/String'
                ]);
            }

            // fetch the type
            const type = await repository.fetchType(typeId);
            await validateDocument(notary, repository, type, debug);

            return type;
        } catch (cause) {
            const exception = bali.exception({
                $module: '/bali/repositories/ValidatedRepository',
                $procedure: '$fetchType',
                $exception: '$unexpected',
                $typeId: typeId,
                $text: 'An unexpected error occurred while attempting to fetch a type.'
            }, cause);
            if (debug) console.error(exception.toString());
            throw exception;
        }
    };

    /**
     * This function creates a new type in the repository.
     * 
     * @param {String} typeId The unique identifier (including version number) for
     * the type being created.
     * @param {Catalog} type A catalog containing the type.
     */
    this.createType = async function(typeId, type) {
        try {
            // validate the arguments
            if (debug > 1) {
                const validator = bali.validator(debug);
                validator.validateType('/bali/repositories/ValidatedRepository', '$createType', '$typeId', typeId, [
                    '/javascript/String'
                ]);
                validator.validateType('/bali/repositories/ValidatedRepository', '$createType', '$type', type, [
                    '/bali/collections/Catalog'
                ]);
            }

            // create the new type
            await validateDocument(notary, repository, type, debug);
            await repository.createType(typeId, type);

        } catch (cause) {
            const exception = bali.exception({
                $module: '/bali/repositories/ValidatedRepository',
                $procedure: '$createType',
                $exception: '$unexpected',
                $typeId: typeId,
                $type: type,
                $text: 'An unexpected error occurred while attempting to create a type.'
            }, cause);
            if (debug) console.error(exception.toString());
            throw exception;
        }
    };

    /**
     * This function adds a new message onto the specified queue in the repository.
     * 
     * @param {String} queueId The unique identifier for the queue.
     * @param {Catalog} message A catalog containing the message.
     */
    this.queueMessage = async function(queueId, message) {
        try {
            // validate the arguments
            if (debug > 1) {
                const validator = bali.validator(debug);
                validator.validateType('/bali/repositories/ValidatedRepository', '$queueMessage', '$queueId', queueId, [
                    '/javascript/String'
                ]);
                validator.validateType('/bali/repositories/ValidatedRepository', '$queueMessage', '$message', message, [
                    '/bali/collections/Catalog'
                ]);
            }

            // place the new message on the queue
            await validateDocument(notary, repository, message, debug);
            await repository.queueMessage(queueId, message);

        } catch (cause) {
            const exception = bali.exception({
                $module: '/bali/repositories/ValidatedRepository',
                $procedure: '$queueMessage',
                $exception: '$unexpected',
                $queueId: queueId,
                $message: message,
                $text: 'An unexpected error occurred while attempting to queue a message.'
            }, cause);
            if (debug) console.error(exception.toString());
            throw exception;
        }
    };

    /**
     * This function removes a message (at random) from the specified queue in the repository.
     * 
     * @param {String} queueId The unique identifier for the queue.
     * @returns {Catalog} A catalog containing the message or <code>undefined</code>
     * if it doesn't exist.
     */
    this.dequeueMessage = async function(queueId) {
        try {
            // validate the arguments
            if (debug > 1) {
                const validator = bali.validator(debug);
                validator.validateType('/bali/repositories/ValidatedRepository', '$dequeueMessage', '$queueId', queueId, [
                    '/javascript/String'
                ]);
            }

            // remove a message from the queue
            const message = await repository.dequeueMessage(queueId);
            if (message) await validateDocument(notary, repository, message, debug);

            return message;
        } catch (cause) {
            const exception = bali.exception({
                $module: '/bali/repositories/ValidatedRepository',
                $procedure: '$dequeueMessage',
                $exception: '$unexpected',
                $queueId: queueId,
                $text: 'An unexpected error occurred while attempting to dequeue a message.'
            }, cause);
            if (debug) console.error(exception.toString());
            throw exception;
        }
    };

    return this;
};
ValidatedRepository.prototype.constructor = ValidatedRepository;
exports.ValidatedRepository = ValidatedRepository;


// PRIVATE FUNCTIONS

/**
 * This function validates the specified document citation against a document to make sure
 * that the citation digest was generated from the same document.  If not, an exception is
 * thrown.
 * 
 * @param {Object} notary The notary to be used when validating the document citation.
 * @param {Object} repository The document repository.
 * @param {Catalog} citation The document citation to be validated.
 * @param {Boolean} debug An optional flag that determines whether or not exceptions
 * will be logged to the error console.
 * @returns {Catalog} The validated document cited by the citation.
 * @throws {Exception} The digest generated for the document does not match the digest
 * contained within the document citation.
 */
const validateCitation = async function(notary, repository, citation, debug) {
    try {
        const documentId = citation.getValue('$tag').getValue() + '/' + citation.getValue('$version');
        const document = await repository.fetchDocument(documentId);
        if (!document) {
            const exception = bali.exception({
                $module: '/bali/repositories/ValidatedRepository',
                $procedure: '$validateCitation',
                $exception: '$missingDocument',
                $documentId: documentId,
                $text: 'The cited document does not exist.'
            });
            if (debug) console.error(exception.toString());
            throw exception;
        }
        await validateDocument(notary, repository, document, debug);
        const matches = await notary.citationMatches(citation, document);
        if (!matches) {
            const exception = bali.exception({
                $module: '/bali/repositories/ValidatedRepository',
                $procedure: '$validateCitation',
                $exception: '$modifiedDocument',
                $citation: citation,
                $document: document,
                $text: 'The cited document was modified after it was committed.'
            });
            if (debug) console.error(exception.toString());
            throw exception;
        }
        return document;
    } catch (cause) {
        const exception = bali.exception({
            $module: '/bali/repositories/ValidatedRepository',
            $procedure: '$validateCitation',
            $exception: '$unexpected',
            $citation: citation,
            $text: 'An unexpected error occurred while attempting to validate a citation.'
        }, cause);
        if (debug) console.error(exception.toString());
        throw exception;
    }
};


/**
 * This function validates a notarized document. It makes sure that all notary seals
 * attached to the document are valid. If any seal is not valid an exception is thrown.
 * 
 * @param {Object} notary The notary to be used for validating the document.
 * @param {Object} repository The document repository.
 * @param {Catalog} document The notarized document to be validated.
 * @param {Boolean} debug An optional flag that determines whether or not exceptions
 * will be logged to the error console.
 * @throws {Exception} The document is not valid.
 */
const validateDocument = async function(notary, repository, document, debug) {
    try {
        // make sure it really is a notarized document
        const component = document.getValue('$document');
        const certificateCitation = document.getValue('$certificate');
        const signature = document.getValue('$signature');
        if (!component || !certificateCitation || !signature) {
            const exception = bali.exception({
                $module: '/bali/repositories/ValidatedRepository',
                $procedure: '$validateDocument',
                $exception: '$documentInvalid',
                $document: document,
                $text: 'The document is not notarized.'
            });
            if (debug) console.error(exception.toString());
            throw exception;
        }

        // validate the previous version of the document if one exists
        const previousCitation = component.getParameter('$previous');
        if (previousCitation && !previousCitation.isEqualTo(bali.pattern.NONE)) {
            // validate the document citation to the previous version of the document
            await validateCitation(notary, repository, previousCitation, debug);
        }

        // validate the certificate if one exists
        var certificate;
        if (!certificateCitation.isEqualTo(bali.pattern.NONE)) {
            certificate = await validateCitation(notary, repository, certificateCitation, debug);
            certificate = certificate.getValue('$document');
        } else {
            certificate = component;  // the document is a self-signed certificate
        }

        // validate the document using its certificate
        const valid = await notary.validDocument(document, certificate);
        if (!valid) {
            const exception = bali.exception({
                $module: '/bali/repositories/ValidatedRepository',
                $procedure: '$validateDocument',
                $exception: '$documentInvalid',
                $document: document,
                $text: 'The signature on the document is invalid.'
            });
            if (debug) console.error(exception.toString());
            throw exception;
        }

    } catch (cause) {
        const exception = bali.exception({
            $module: '/bali/repositories/ValidatedRepository',
            $procedure: '$validateDocument',
            $exception: '$unexpected',
            $document: document,
            $text: 'An unexpected error occurred while attempting to validate a document.'
        }, cause);
        if (debug) console.error(exception.toString());
        throw exception;
    }
};
