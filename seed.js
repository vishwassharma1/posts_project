// seed.js

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Post = require('./models/post');
const Tag = require('./models/tag');

dotenv.config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));

// Define the data to be seeded
const postData = [
  {
    title: 'Post 1',
    desc: 'Description for Post 1',
    image: 'image1.jpg',
    tags: [],
  },
  {
    title: 'Post 2',
    desc: 'Description for Post 2',
    image: 'image2.jpg',
    tags: [],
  },
];

const tagData = [{ name: 'Tag 1' }, { name: 'Tag 2' }, { name: 'Tag 3' }];

// Function to delete existing data
const deleteData = async () => {
  try {
    await Post.deleteMany();
    await Tag.deleteMany();
    console.log('Existing data deleted successfully.');
  } catch (err) {
    console.error('Failed to delete existing data:', err);
  }
};

// Function to seed new data
const seedData = async () => {
  try {
    // Create tags and store their ObjectIds
    const createdTags = await Tag.create(tagData);
    const tagIds = createdTags.map((tag) => tag._id);

    // Create posts with the associated tags
    const posts = postData.map((post) => ({
      ...post,
      tags: tagIds,
    }));

    await Post.create(posts);
    console.log('Data seeded successfully.');
  } catch (err) {
    console.error('Failed to seed data:', err);
  }
};

// Delete existing data and seed new data
const seed = async () => {
  await deleteData();
  await seedData();
  mongoose.disconnect();
};

seed();
