![Logo](https://raw.githubusercontent.com/craterdog-bali/bali-project-documentation/master/images/CraterDogLogo.png)

### Bali Document Repository
This project provides a JavaScript version of the document repository classes for the [_Bali Nebula™_](https://github.com/craterdog-bali/bali-project-documentation/wiki). It defines the interface to the document repository and the following implementations of that interface:
 * **LocalRepository** - This implementation uses the local filesystem as the repository and is only for testing.
 * **RemoteRepository** - This implementation uses a remote repository service and accesses it via HTTPS.
 * **S3Repository** - This implementation uses the AWS S3 filesystem as the repository and is only accessible with the proper AWS credentials.

![Pyramid](https://raw.githubusercontent.com/craterdog-bali/js-bali-document-repository/master/docs/images/BaliPyramid.png)

_**WARNING**_
_This project is still in its early stages and the classes and interfaces to the classes are likely to change._

### Quick Links
For more information on this project click on the following links:
 * [wiki](https://github.com/craterdog-bali/js-bali-document-repository/wiki)
 * [node package](https://www.npmjs.com/package/bali-document-repository)
 * [release notes](https://github.com/craterdog-bali/js-bali-document-repository/wiki/release-notes)
 * [project documentation](https://github.com/craterdog-bali/bali-project-documentation/wiki)

### Getting Started
To install this NodeJS package, execute the following command:
```
npm install bali-document-repository
```
Then add the following line to your NodeJS modules:
```
const repository = require('bali-document-repository');
```

Check out the example code [here](https://github.com/craterdog-bali/js-bali-document-repository/wiki/code-examples).

### Contributing
Project contributors are always welcome. Create a [fork](https://github.com/craterdog-bali/js-bali-document-repository) of the project and add cool new things to the framework. When you are ready to contribute the changes create a subsequent ["pull request"](https://help.github.com/articles/about-pull-requests/). Any questions and comments can be sent to craterdog@gmail.com.
