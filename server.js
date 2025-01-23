const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const moment = require('moment');
const Razorpay = require('razorpay'); // Import Razorpay
const dotenv = require('dotenv'); // Import dotenv
const multer = require('multer');
const csv = require('csv-parser'); // For CSV parsing
const fs = require('fs');
const xlsx = require('xlsx'); // For Excel parsing
const port = 3022; // Updated port number

// Load environment variables from .env file
dotenv.config();

const app = express();

// Middleware to parse JSON requests
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // For parsing form data

// Serve static files
app.use(express.static(__dirname));

// Route to serve index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'html', 'index.html')); // Updated file path
});

// Connect to MongoDB
mongoose.connect('mongodb://127.0.0.1:27017/Login_page')
    .then(() => console.log("MongoDB connection successful"))
    .catch(err => console.error("MongoDB connection error:", err));

// Handle MongoDB connection
const db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));
db.once('open', () => {
    console.log("MongoDB connection is open");
});

// Define a Mongoose Schema and Model
const userSchema = new mongoose.Schema({
    seats: Number,
    departure: String,
    arrival: String,
    phone: Number,
    email: String,
    date: String,
    time: String,
    paymentId: String, // Add paymentId to store Razorpay payment ID
    ticketNumber: String // Add ticketNumber field to store the random ticket number
});

const Users = mongoose.model("data", userSchema);

// Initialize Razorpay instance with keys from .env
const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_ID_KEY, // Your Razorpay key id from .env
    key_secret: process.env.RAZORPAY_SECRET_KEY // Your Razorpay secret key from .env
});

// Handle POST request to create an order
app.post('/create-order', async (req, res) => {
    const { amount, currency, receipt, name, description, contact, email } = req.body;

    try {
        const options = {
            amount: amount, // amount in the smallest currency unit
            currency: currency,
            receipt: receipt,
            notes: {
                name: name,
                description: description,
                contact: contact,
                email: email
            }
        };

        const order = await razorpay.orders.create(options);
        console.log("Order created:", order); // Log the created order details

        res.json({
            key_id: process.env.RAZORPAY_ID_KEY,
            amount: order.amount,
            currency: order.currency,
            order_id: order.id,
            name: name,
            description: description
        });
    } catch (error) {
        console.error("Error creating order:", error); // Detailed error logging
        res.status(500).send('Error creating order');
    }
});

// Handle POST request to store data
app.post('/post', async (req, res) => {
    console.log("Received data:", req.body); // Log the received data
    try {
        const { seats, departure, arrival, phone, email, paymentId } = req.body;

        // Validate input data (optional, for better control)
        if (!seats || !departure || !arrival || !phone || !email || !paymentId) {
            return res.status(400).send("All fields are required!");
        }

        // Get the current time
        const currentTime = new Date();
        const currentDate = moment(currentTime).format('YYYY-MM-DD');
        const currentTimeString = moment(currentTime).format('HH:mm:ss');

        // Generate a random ticket number
        const ticketNumber = 'TICKET-' + Math.floor(100000 + Math.random() * 900000); // Random ticket number format

        // Save data to MongoDB
        const userData = new Users({ seats, departure, arrival, phone, email, date: currentDate, time: currentTimeString, paymentId, ticketNumber });
        const savedData = await userData.save();

        console.log("Data saved successfully:", savedData); // Log success
        // Send a success response with the necessary data
        res.status(200).json({
            message: "Data saved successfully",
            ticketNumber: ticketNumber, // Include ticket number in the response
            name: email, // User's name (using email for simplicity)
            paymentId: paymentId // Payment ID
        });
    } catch (err) {
        console.error("Error saving data:", err.message); // Log error message
        res.status(500).send("An error occurred while saving the data: " + err.message); // Include error message in response
    }
});

// Handle GET request to retrieve data
app.get('/get', async (req, res) => {
    try {
        const users = await Users.find();
        res.status(200).send(users);
    } catch (err) {
        console.error("Error retrieving data:", err);
        res.status(500).send("An error occurred while retrieving the data.");
    }
});

// New route to handle data upload
app.post('/upload-data', upload.single('dataFile'), async (req, res) => {
    const filePath = req.file.path;

    // Check file type and parse accordingly
    if (req.file.mimetype === 'text/csv') {
        // Parse CSV file
        const results = [];
        fs.createReadStream(filePath)
            .pipe(csv())
            .on('data', (data) => results.push(data))
            .on('end', async () => {
                console.log("Parsed CSV Data:", results); // Log the parsed data
                // Insert data into MongoDB
                try {
                    await Users.insertMany(results);
                    res.status(200).send("Data uploaded successfully!");
                } catch (error) {
                    console.error("Error saving data to MongoDB:", error); // Log error
                    res.status(500).send("Error saving data to MongoDB.");
                }
            })
            .on('error', (error) => {
                console.error("Error reading CSV file:", error); // Log error
                res.status(500).send("Error reading CSV file.");
            });
    } else if (req.file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
        // Parse Excel file
        const workbook = xlsx.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

        console.log("Parsed Excel Data:", data); // Log the parsed data

        // Insert data into MongoDB
        try {
            await Users.insertMany(data);
            res.status(200).send("Data uploaded successfully!");
        } catch (error) {
            console.error("Error saving data to MongoDB:", error); // Log error
            res.status(500).send("Error saving data to MongoDB.");
        }
    } else {
        res.status(400).send("Unsupported file type.");
    }
});

// Start the server
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});

// Serve the HTML with embedded JavaScript for Razorpay
app.get('/index.html', (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Bus Booking Form</title>
        <link rel="stylesheet" href="style_ticket.css">
        <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
        <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
    </head>
    <body>
        <h1>Book with us</h1>
        <form id="bookingForm">
            <section>
                <p>Step 1: Number of Seats</p>
                <label for="seats">Number of Seats:</label>
                <input type="number" id="seats" name="seats" placeholder="Enter number of seats" required>
            </section>
            <section>
                <p>Step 2: Departure and Arrival</p>
                <label for="departure">Departure:</label>
                <select id="departure" name="departure" required>
                    <option value="">Select Departure</option>
                    <option value="City A">City A</option>
                    <option value="City B">City B</option>
                    <option value="City C">City C</option>
                </select>
                <label for="arrival">Arrival:</label>
                <select id="arrival" name="arrival" required>
                    <option value="">Select Arrival</option>
                    <option value="City A">City A</option>
                    <option value="City B">City B</option>
                    <option value="City C">City C</option>
                </select>
            </section>
            <section>
                <p>Step 3: Contact Information</p>
                <label for="phone">Phone Number:</label>
                <input type="tel" id="phone" name="phone" placeholder="Enter your phone number" required>
                <label for="email">Email:</label>
                <input type="email" id="email" name="email" placeholder="Enter your email" required>
            </section>
            <button type="button" id="submit" class="button" style="color: white;">BOOK NOW</button>
        </form>
        <script src="script.js"></script>
        <script>
            $(document).ready(function () {
                $('#submit').click(function () {
                    // Get form data
                    var seats = $('#seats').val();
                    var departure = $('#departure').val();
                    var arrival = $('#arrival').val();
                    var phone = $('#phone').val();
                    var email = $('#email').val();

                    // Create an order on the server
                    $.ajax({
                        url: '/create-order', // Your server endpoint to create an order
                        method: 'POST',
                        data: {
                            amount: seats * 100, // Assuming each seat costs 100
                            currency: 'INR',
                            receipt: 'receipt#1',
                            name: 'Bus Booking',
                            description: 'Booking for ' + seats + ' seats from ' + departure + ' to ' + arrival,
                            contact: phone,
                            email: email
                        },
                        success: function (response) {
                            console.log("Order created successfully:", response); // Log the response
                            // Initialize Razorpay payment
                            var options = {
                                key: response.key_id, // Your Razorpay key id
                                amount: response.amount, // Amount is in currency subunits
                                currency: response.currency,
                                name: response.name,
                                description: response.description,
                                order_id: response.order_id, // This is the order_id created in your server
                                handler: function (paymentResponse) {
                                    console.log("Payment successful:", paymentResponse); // Log payment response
                                    // Send the payment details to your server
                                    $.ajax({
                                        url: '/post', // Your server endpoint to save data
                                        method: 'POST',
                                        data: {
                                            seats: seats,
                                            departure: departure,
                                            arrival: arrival,
                                            phone: phone,
                                            email: email,
                                            paymentId: paymentResponse.razorpay_payment_id // Send payment ID
                                        },
                                        success: function (savedData) {
                                            console.log("Data saved successfully."); // Log success
                                            // Redirect to thanku.html after successful data save with parameters
                                            window.location.href = 'thanku.html?ticketNumber=' + savedData.ticketNumber + '&name=' + email + '&paymentId=' + paymentResponse.razorpay_payment_id;
                                        },
                                        error: function () {
                                            console.error('Error saving data.'); // Log error
                                            alert('Error saving data. Please try again.');
                                        }
                                    });
                                },
                                prefill: {
                                    name: email, // Prefill name
                                    email: email, // Prefill email
                                    contact: phone // Prefill contact
                                },
                                theme: {
                                    color: "#F37254" // Customize the theme color
                                }
                            };
                            var rzp1 = new Razorpay(options);
                            rzp1.open();
                        },
                        error: function (error) {
                            console.error('Error creating order:', error); // Log error
                            alert('Error creating order. Please try again.');
                        }
                    });
                });
            });
        </script>
    </body>
    </html>
    `);
});

// Serve thanku.html
app.get('/thanku.html', (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Thank You</title>
        <link rel="stylesheet" href="../style.css"> <!-- Link to the main stylesheet -->
        <style>
            body {
                font-family: 'Noto Sans', sans-serif; /* Match font with other HTML files */
                background-color: #f0f0f0;
                text-align: center;
                padding: 50px;
            }
            h1 {
                color: #4CAF50;
                font-size: 2.5em; /* Increase font size for emphasis */
            }
            p {
                font-size: 1.2em; /* Increase font size for better readability */
                margin: 10px 0;
            }
            .ticket-info {
                background-color: #fff; /* White background for ticket info */
                border-radius: 8px; /* Rounded corners */
                padding: 20px; /* Padding for spacing */
                box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1); /* Subtle shadow */
                display: inline-block; /* Center the box */
            }
            .button-container {
                margin-top: 20px; /* Space above buttons */
            }
            .button {
                background-color: #4CAF50; /* Green background */
                color: white; /* White text */
                padding: 10px 20px; /* Padding */
                border: none; /* No border */
                border-radius: 5px; /* Rounded corners */
                cursor: pointer; /* Pointer cursor on hover */
                margin: 10px; /* Margin for spacing */
            }
            .button:hover {
                background-color: #45a049; /* Darker green on hover */
            }
        </style>
    </head>
    <body>
        <h1>Thank You for Your Booking!</h1>
        <p>Your booking has been successfully completed.</p>
        <div class="ticket-info">
            <p>Ticket Number: <span id="ticketNumber"></span></p>
            <p>Name: <span id="userName"></span></p>
            <p>Payment ID: <span id="paymentId"></span></p>
        </div>

        <div class="button-container">
            <button class="button" onclick="window.location.href='../index.html'">Go to Home Page</button>
            <button class="button" onclick="window.location.href='../Ticket.html'">Book Another Ticket</button>
        </div>

        <script>
            // Get the data from the URL parameters
            const urlParams = new URLSearchParams(window.location.search);
            const ticketNumber = urlParams.get('ticketNumber');
            const userName = urlParams.get('name');
            const paymentId = urlParams.get('paymentId');

            // Display the data on the page
            document.getElementById('ticketNumber').textContent = ticketNumber;
            document.getElementById('userName').textContent = userName;
            document.getElementById('paymentId').textContent = paymentId;
        </script>
    </body>
    </html>
    `);
});
