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
 * This class implements an AWS S3 bucket based storage mechanism.  It treats
 * documents as UTF-8 encoded strings.
 */
const aws = new require('aws-sdk/clients/s3');
const s3 = new aws({apiVersion: '2006-03-01'});


// PRIVATE CONSTANTS

// the POSIX end of line character
const EOL = '\n';


// DOCUMENT REPOSITORY

/**
 * This function creates a new instance of an S3 storage mechanism proxy.
 *
 * @param {DigitalNotary} notary The digital notary to be used to cite the documents.
 * @param {Object} configuration An object containing the S3 configuration information.
 * @param {Boolean|Number} debug An optional number in the range [0..3] that controls the level of
 * debugging that occurs:
 * <pre>
 *   0 (or false): no logging
 *   1 (or true): log exceptions to console.error
 *   2: perform argument validation and log exceptions to console.error
 *   3: perform argument validation and log exceptions to console.error and debug info to console.log
 * </pre>
 * @returns {Object} The new S3 storage mechanism proxy.
 */
const S3Storage = function(notary, configuration, debug) {
    // validate the arguments
    if (debug === null || debug === undefined) debug = 0;  // default is off
    const bali = require('bali-component-framework').api(debug);
    if (debug > 1) {
        const validator = bali.validator(debug);
        validator.validateType('/bali/repositories/S3Storage', '$S3Storage', '$configuration', configuration, [
            '/javascript/Object'
        ]);
    }

    this.toString = function() {
        const catalog = bali.catalog({
            $module: '/bali/repositories/S3Storage',
            $configuration: configuration
        });
        return catalog.toString();
    };

    this.nameExists = async function(name) {
        try {
            const bucket = configuration.names;
            const key = generateNameKey(name);
            return await doesExist(bucket, key);
        } catch (cause) {
            const exception = bali.exception({
                $module: '/bali/repositories/S3Storage',
                $procedure: '$nameExists',
                $exception: '$unexpected',
                $configuration: configuration,
                $name: name,
                $text: 'An unexpected error occurred while checking whether or not a citation exists.'
            }, cause);
            if (debug > 0) console.error(exception.toString());
            throw exception;
        }
    };

    this.readName = async function(name) {
        try {
            var bucket = configuration.names;
            var key = generateNameKey(name);
            var object = await getObject(bucket, key);
            if (object) {
                var source = object.toString();
                const citation = bali.component(source);
                bucket = configuration.documents;
                const tag = citation.getValue('$tag');
                const version = citation.getValue('$version');
                key = generateDocumentKey(tag, version);
                object = await getObject(bucket, key);
                if (object) {
                    source = object.toString();
                    const document = bali.component(source);
                    return document;
                }
            }
        } catch (cause) {
            const exception = bali.exception({
                $module: '/bali/repositories/S3Storage',
                $procedure: '$readName',
                $exception: '$unexpected',
                $configuration: configuration,
                $name: name,
                $text: 'An unexpected error occurred while attempting to read a citation from the repository.'
            }, cause);
            if (debug > 0) console.error(exception.toString());
            throw exception;
        }
    };

    this.writeName = async function(name, citation) {
        try {
            const bucket = configuration.names;
            const key = generateNameKey(name);
            if (await doesExist(bucket, key)) throw Error('The citation already exists.');
            const source = citation.toString() + EOL;  // add POSIX compliant <EOL>
            await putObject(bucket, key, source);
            return citation;
        } catch (cause) {
            const exception = bali.exception({
                $module: '/bali/repositories/S3Storage',
                $procedure: '$writeName',
                $exception: '$unexpected',
                $configuration: configuration,
                $name: name,
                $citation: citation,
                $text: 'An unexpected error occurred while attempting to write a citation to the repository.'
            }, cause);
            if (debug > 0) console.error(exception.toString());
            throw exception;
        }
    };

    this.draftExists = async function(tag, version) {
        try {
            const bucket = configuration.drafts;
            const key = generateDocumentKey(tag, version);
            return await doesExist(bucket, key);
        } catch (cause) {
            const exception = bali.exception({
                $module: '/bali/repositories/S3Storage',
                $procedure: '$draftExists',
                $exception: '$unexpected',
                $configuration: configuration,
                $tag: tag,
                $version: version,
                $text: 'An unexpected error occurred while checking whether or not a draft exists.'
            }, cause);
            if (debug > 0) console.error(exception.toString());
            throw exception;
        }
    };

    this.readDraft = async function(tag, version) {
        try {
            const bucket = configuration.drafts;
            const key = generateDocumentKey(tag, version);
            const object = await getObject(bucket, key);
            if (object) {
                const source = object.toString();
                const draft = bali.component(source);
                return draft;
            }
        } catch (cause) {
            const exception = bali.exception({
                $module: '/bali/repositories/S3Storage',
                $procedure: '$readDraft',
                $exception: '$unexpected',
                $configuration: configuration,
                $tag: tag,
                $version: version,
                $text: 'An unexpected error occurred while attempting to read a draft from the repository.'
            }, cause);
            if (debug > 0) console.error(exception.toString());
            throw exception;
        }
    };

    this.writeDraft = async function(draft) {
        try {
            const bucket = configuration.drafts;
            const tag = draft.getValue('$content').getParameter('$tag');
            const version = draft.getValue('$content').getParameter('$version');
            const key = generateDocumentKey(tag, version);
            const source = draft.toString() + EOL;  // add POSIX compliant <EOL>
            await putObject(bucket, key, source);
            return await notary.citeDocument(draft);
        } catch (cause) {
            const exception = bali.exception({
                $module: '/bali/repositories/S3Storage',
                $procedure: '$writeDraft',
                $exception: '$unexpected',
                $configuration: configuration,
                $draft: draft,
                $text: 'An unexpected error occurred while attempting to write a draft to the repository.'
            }, cause);
            if (debug > 0) console.error(exception.toString());
            throw exception;
        }
    };

    this.deleteDraft = async function(tag, version) {
        try {
            const bucket = configuration.drafts;
            const key = generateDocumentKey(tag, version);
            const object = await getObject(bucket, key);
            if (object) {
                const source = object.toString();
                const draft = bali.component(source);
                await deleteObject(bucket, key);
                return draft;
            }
        } catch (cause) {
            const exception = bali.exception({
                $module: '/bali/repositories/S3Storage',
                $procedure: '$deleteDraft',
                $exception: '$unexpected',
                $configuration: configuration,
                $tag: tag,
                $version: version,
                $text: 'An unexpected error occurred while attempting to delete a draft from the repository.'
            }, cause);
            if (debug > 0) console.error(exception.toString());
            throw exception;
        }
    };

    this.documentExists = async function(tag, version) {
        try {
            const bucket = configuration.documents;
            const key = generateDocumentKey(tag, version);
            return await doesExist(bucket, key);
        } catch (cause) {
            const exception = bali.exception({
                $module: '/bali/repositories/S3Storage',
                $procedure: '$documentExists',
                $exception: '$unexpected',
                $configuration: configuration,
                $tag: tag,
                $version: version,
                $text: 'An unexpected error occurred while checking whether or not a document exists.'
            }, cause);
            if (debug > 0) console.error(exception.toString());
            throw exception;
        }
    };

    this.readDocument = async function(tag, version) {
        try {
            const bucket = configuration.documents;
            const key = generateDocumentKey(tag, version);
            const object = await getObject(bucket, key);
            if (object) {
                const source = object.toString();
                const document = bali.component(source);
                return document;
            }
        } catch (cause) {
            const exception = bali.exception({
                $module: '/bali/repositories/S3Storage',
                $procedure: '$readDocument',
                $exception: '$unexpected',
                $configuration: configuration,
                $tag: tag,
                $version: version,
                $text: 'An unexpected error occurred while attempting to read a document from the repository.'
            }, cause);
            if (debug > 0) console.error(exception.toString());
            throw exception;
        }
    };

    this.writeDocument = async function(document) {
        try {
            const bucket = configuration.documents;
            const tag = document.getValue('$content').getParameter('$tag');
            const version = document.getValue('$content').getParameter('$version');
            const key = generateDocumentKey(tag, version);
            if (await doesExist(bucket, key)) throw Error('The document already exists.');
            const source = document.toString() + EOL;  // add POSIX compliant <EOL>
            await putObject(bucket, key, source);
            return await notary.citeDocument(document);
        } catch (cause) {
            const exception = bali.exception({
                $module: '/bali/repositories/S3Storage',
                $procedure: '$writeDocument',
                $exception: '$unexpected',
                $configuration: configuration,
                $document: document,
                $text: 'An unexpected error occurred while attempting to write a document to the repository.'
            }, cause);
            if (debug > 0) console.error(exception.toString());
            throw exception;
        }
    };

    this.messageCount = async function(bag) {
        try {
            const bucket = configuration.bags;
            const key = generateBagKey(bag);
            const list = await listObjects(bucket, key);
            return list.length;
        } catch (cause) {
            const exception = bali.exception({
                $module: '/bali/repositories/S3Storage',
                $procedure: '$messageCount',
                $exception: '$unexpected',
                $configuration: configuration,
                $bag: bag,
                $text: 'An unexpected error occurred while attempting to check the number of messages that are in a bag.'
            }, cause);
            if (debug > 0) console.error(exception.toString());
            throw exception;
        }
    };

    this.addMessage = async function(bag, message) {
        const identifier = bali.tag();
        try {
            const bucket = configuration.bags;
            const key = generateMessageKey(bag, identifier);
            const source = message.toString() + EOL;  // add POSIX compliant <EOL>
            await putObject(bucket, key, source);
            return await notary.citeDocument(message);
        } catch (cause) {
            const exception = bali.exception({
                $module: '/bali/repositories/S3Storage',
                $procedure: '$addMessage',
                $exception: '$unexpected',
                $configuration: configuration,
                $bag: bag,
                $identifier: identifier,
                $message: message,
                $text: 'An unexpected error occurred while attempting to add a message to a bag.'
            }, cause);
            if (debug > 0) console.error(exception.toString());
            throw exception;
        }
    };

    this.removeMessage = async function(bag) {
        try {
            while (true) {
                const bucket = configuration.bags;
                var key = generateBagKey(bag);
                const list = await listObjects(bucket, key);
                const count = list.length;
                if (count === 0) break;  // no more messages
                const messages = bali.list(list);
                // select a message at random since a distributed bag cannot guarantee FIFO
                const generator = bali.generator();
                const index = generator.generateIndex(count);
                key = messages.getItem(index).getValue();
                const object = await getObject(bucket, key);
                if (object) {
                    var message = object.toString();
                    message = bali.component(message);
                    await deleteObject(bucket, key);
                    return message;  // we got there first
                }
                // someone else got there first, keep trying
            }
        } catch (cause) {
            const exception = bali.exception({
                $module: '/bali/repositories/S3Storage',
                $procedure: '$removeMessage',
                $exception: '$unexpected',
                $configuration: configuration,
                $bag: bag,
                $text: 'An unexpected error occurred while attempting to remove a message from a bag.'
            }, cause);
            if (debug > 0) console.error(exception.toString());
            throw exception;
        }
    };

    const generateNameKey = function(name) {
        var key = name.toString().slice(1);  // remove the leading '/'
        key += '.bali';
        return key;
    };

    const generateDocumentKey = function(tag, version) {
        var key = tag.toString().slice(1);  // remove the leading '#'
        key += '/' + version.toString();
        key += '.bali';
        return key;
    };

    const generateBagKey = function(bag) {
        return bag.toString().slice(1);  // remove the leading '#'
    };

    const generateMessageKey = function(bag, identifier) {
        var key = bag.toString().slice(1);  // remove the leading '#'
        key += '/' + identifier.toString().slice(1);  // remove the leading '#'
        key += '.bali';
        return key;
    };

    return this;
};
S3Storage.prototype.constructor = S3Storage;
exports.S3Storage = S3Storage;


/**
 * This function causes the current thread to sleep for the specified number of milliseconds.
 * NOTE: it must be called using 'await' or it won't work.
 *
 * @param {Number} milliseconds The number of milliseconds to sleep.
 * @returns {Promise} A promise to return after the specified time has gone by.
 */
const sleep = function(milliseconds) {
    return new Promise(function(resolve) {
        setTimeout(resolve, milliseconds);
    });
};


// AWS S3 PROMISIFICATION

const listObjects = function(bucket, prefix) {
    return new Promise(function(resolve, reject) {
        try {
            // the resulting list contains objects with metadata, we only want the keys
            s3.listObjectsV2({Bucket: bucket, Prefix: prefix, MaxKeys: 64}, function(error, data) {
                if (error) {
                    reject(error);
                } else {
                    const list = [];
                    data.Contents.forEach(function(object) {
                        list.push(object.Key);
                    });
                    resolve(list);
                }
            });
        } catch (cause) {
            reject(cause);
        }
    });
};


const doesExist = function(bucket, key) {
    return new Promise(function(resolve, reject) {
        try {
            // the result is an object containing metadata about the object or an error
            // if it never existed
            s3.headObject({Bucket: bucket, Key: key}, function(error, data) {
                // must check for the delete marker for versioned buckets
                if (error || data.DeleteMarker || !data.ContentLength) {
                    resolve(false);
                } else {
                    resolve(true);
                }
            });
        } catch (cause) {
            reject(cause);
        }
    });
};


const getObject = function(bucket, key) {
    return new Promise(function(resolve, reject) {
        try {
            // the resulting object is always a Buffer (may contain utf8 encoded string)
            s3.getObject({Bucket: bucket, Key: key}, function(error, data) {
                // must check for the delete marker for versioned buckets
                if (error || data.DeleteMarker || !data.ContentLength) {
                    resolve(undefined);
                } else {
                    resolve(data.Body);
                }
            });
        } catch (cause) {
            reject(cause);
        }
    });
};


const putObject = function(bucket, key, object) {
    return new Promise(function(resolve, reject) {
        try {
            // the object may be of type String or Buffer (strings are converted to utf8
            // Buffer automatically)
            s3.putObject({Bucket: bucket, Key: key, Body: object}, function(error) {
                if (error) {
                    reject(error);
                } else {
                    resolve();
                }
            });
        } catch (cause) {
            reject(cause);
        }
    });
};


const deleteObject = function(bucket, key) {
    return new Promise(function(resolve, reject) {
        try {
            // NOTE: for non-versioned buckets, deleteObject returns an empty object so
            // there is no way to know whether or not the object even existed.
            s3.deleteObject({Bucket: bucket, Key: key}, function(error) {
                if (error) {
                    reject(error);
                } else {
                    resolve();
                }
            });
        } catch (cause) {
            reject(cause);
        }
    });
};
