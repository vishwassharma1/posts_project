const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const admin = require('firebase-admin');
const serviceAccount = require('./creds.json');
const dotenv = require('dotenv');
const Tag = require('./models/tag');
const Post = require('./models/post');

dotenv.config();

// Initialize Express app
const app = express();
app.use(express.json()); // Parse JSON bodies
app.use(express.urlencoded({ extended: true }));

// Configure Firebase admin SDK
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: 'gs://my-api-9c702.appspot.com',
});

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));

// Create a new post
//  payload should look like this {
//   "title": "testing",
//   "desc": "testing",
//   "image": "testing",
// }

app.get('/favicon.ico', (req, res) => res.status(204));

const storage = multer.memoryStorage();
const upload = multer({ storage });

app.post('/posts', upload.single('image'), async (req, res) => {
  try {
    // Get the file buffer of the uploaded image
    const fileBuffer = req.file.buffer;

    // Upload the image to Firebase Storage
    const bucket = admin.storage().bucket();
    const fileName = `${Date.now()}-${req.file.originalname}`;
    const file = bucket.file(fileName);
    await file.save(fileBuffer, {
      metadata: {
        metadata: {
          firebaseStorageDownloadTokens: Date.now(),
        },
      },
    });

    // Create the post in MongoDB
    const post = new Post({
      title: req.body.title,
      desc: req.body.desc,
      image: fileName,
    });
    await post.save();

    res.status(201).json(post);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create post' });
  }
});

// Get all posts with filtering, sorting, and pagination
app.get('/posts', async (req, res) => {
  try {
    // Fetch posts from MongoDB
    const posts = await Post.find({}).exec();

    res.json(posts);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch posts' });
  }
});

// Search for posts based on keywords
app.get('/posts/search', async (req, res) => {
  try {
    const Post = require('./models/post');
    const keyword = req.query.keyword;

    const posts = await Post.find({
      $or: [
        { title: { $regex: keyword, $options: 'i' } },
        { desc: { $regex: keyword, $options: 'i' } },
      ],
    }).exec();

    res.json(posts);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to search for posts' });
  }
});

// Filter posts by tags
app.get('/posts/filter', async (req, res) => {
  try {
    const Post = require('./models/post');
    const tag = req.query.tag;

    const posts = await Post.find({ tags: tag }).exec();

    res.json(posts);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to filter posts' });
  }
});

app.post('/tags', async (req, res) => {
  try {
    const { name } = req.body;
    const tag = new Tag({ name });
    await tag.save();
    res.status(201).json(tag);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create tag' });
  }
});

app.post('/posts/:postId/tags', async (req, res) => {
  try {
    const { postId } = req.params;
    const { tagIds } = req.body;

    // Find the post by ID
    const post = await Post.findById(postId);

    // Find the tags by IDs
    const tags = await Tag.find({ _id: { $in: tagIds } });

    // Associate the tags with the post
    post.tags = tags.map((tag) => tag._id);
    await post.save();

    res.json(post);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to associate tags with post' });
  }
});

module.exports = app; // Export the Express app

// Start the server
if (require.main === module) {
  const port = process.env.PORT || 3000;
  app.listen(port, () => {
    console.log(`Server is listening on port ${port}`);
  });
}
