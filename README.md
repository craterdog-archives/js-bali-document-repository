## The Bali Document Repository™ (v2)
<img src="https://craterdog.com/images/CraterDogLogo.png" width="50%">

### Quick Links
For more information on this project click on the following links:
 * [project documentation](https://github.com/craterdog-bali/js-bali-document-repository/wiki)
 * [node packages](https://www.npmjs.com/package/bali-document-repository)
 * [release notes](https://github.com/craterdog-bali/js-bali-document-repository/wiki/release-notes)
 * [code examples](https://github.com/craterdog-bali/js-bali-document-repository/wiki/code-examples)

### Getting Started
To install this NodeJS package, execute the following command:
```
npm install bali-document-repository
```
Then add the following line to your NodeJS modules:
```
const bali = require('bali-component-framework').api();
const account = bali.tag();  // new random account tag
const securityModule = require('bali-digital-notary').ssm();
const notary = require('bali-digital-notary').notary(securityModule, account);
const local = require('bali-document-repository').local(notary);
const validated = require('bali-document-repository').validated(notary, local);
const cached = require('bali-document-repository').cached(validated);
const repository = require('bali-document-repository').repository(cached);
```

### Contributing
Project contributors are always welcome. Create a
[fork](https://github.com/craterdog-bali/js-bali-document-repository) of the project and add cool
new things to the project. When you are ready to contribute the changes create a subsequent
["pull request"](https://help.github.com/articles/about-pull-requests/). Any questions and
comments can be sent to [craterdog@gmail.com](mailto:craterdog@gmail.com).
