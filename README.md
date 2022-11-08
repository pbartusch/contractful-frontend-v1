# contractful frontend

![Vercel](https://vercelbadge.vercel.app/api/[owner]/[repo])

The frontend for trustless and decentralized contracting solution.

Official demo: [https://contractful.vercel.app/]

The full protocol of the solution can be interfaced by using the official demo (see above). Anyway, You will learn, how to use the contractful frontend, to create, deploy and sign a Hiring Agreement just from you local machine.

For details on the project, please visit [https://github.com/contractful/protocol-v1].

## Getting started

For firing up the fronted locally, please use the following instructions:

* Make sure, you have `node` and `npm` installed. The project is tested with:

```
% node --version
v18.7.0

% npm --version
8.15.0
```

* `git clone` this repository.
* `cd` into `frontend-v1`.
* When starting the frontend for the first time, please install all dependencies: `npm i`.
* Use `npx next dev` to start the frontend.
* Finally, visit: [http://localhost:3000/].

👍 Well done - you are now able to create, deploy and sign trustless decentralized Hiring Agreements from your local machine.

## Notes for development

### Build and lint

Use the following command to build or lint the frontend application:

```
npx next build
npx next lint
```

### Boostrapping of the frontend application

Initially, this application was bootstrapped using the following commands (for the UI application skeleton):

```
npx create-next-app@latest --typescript

npm i mui@latest
npm i @mui/material @emotion/react @emotion/styled
npm i @mui/icons-material
npm i @mui/x-date-pickers
npm i dayjs
npm i react-cookie

[...]
```

There are several other libraries involved (e.g. for the integration with the Wallet / blockchain). Please check: [./package.json] for all dependencies.

😀 Have fun coding!
