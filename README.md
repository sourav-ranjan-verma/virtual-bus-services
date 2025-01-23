# Virtual Bus Services

## Description
Virtual Bus Services (VBS) is a web application that allows users to book bus tickets, check bus locations, and view routes. The homepage welcomes users and provides navigation to various sections of the site.

## Installation
To install the necessary packages, run the following command:

```bash
npm install
```

## Usage
To start the application, use the following command:

```bash
npm start
```

This will run the server using `server.js`.

## Dependencies
The project uses the following key dependencies:
- **express**: A web framework for Node.js.
- **dotenv**: For environment variable management.
- **mongoose**: For MongoDB object modeling.
- **nodemon**: For automatically restarting the server during development.
- **@emailjs/browser**: For email handling.
- **csv-parser**: For file parsing.
- **razorpay**: For payment processing.
- **multer**: For handling file uploads.
- **moment**: For date manipulation.
- **xlsx**: For reading and writing Excel files.

## File Structure
- **index.js**: Main entry point for the application.
- **package.json**: Contains project metadata and dependencies.
- **server.js**: Server configuration and routing.
- **html/**: Contains HTML files for the web application.
- **css/**: Contains stylesheets for the application.
- **js/**: Contains JavaScript files for client-side functionality.
- **images/**: Contains image assets for the application.
