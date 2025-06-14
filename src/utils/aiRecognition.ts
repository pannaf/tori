import { Room, Category } from '../types/inventory';

// Enhanced AI recognition with more realistic object detection
export const recognizeObjects = async (imageData: string): Promise<{
  objects: Array<{ name: string; confidence: number; category: string }>;
  room: string;
  suggestedName: string;
  suggestedCategory: string;
}> => {
  // Simulate API delay for realistic feel
  await new Promise(resolve => setTimeout(resolve, 2000));

  // More comprehensive object recognition database
  const objectDatabase = [
    // Electronics
    { name: 'MacBook Pro', category: 'Electronics', rooms: ['Office', 'Bedroom', 'Living Room'] },
    { name: 'iPhone', category: 'Electronics', rooms: ['Bedroom', 'Living Room', 'Office'] },
    { name: 'iPad', category: 'Electronics', rooms: ['Living Room', 'Bedroom', 'Office'] },
    { name: 'Gaming Console', category: 'Electronics', rooms: ['Living Room', 'Bedroom'] },
    { name: 'Smart TV', category: 'Electronics', rooms: ['Living Room', 'Bedroom'] },
    { name: 'Wireless Headphones', category: 'Electronics', rooms: ['Office', 'Bedroom'] },
    { name: 'Camera', category: 'Electronics', rooms: ['Office', 'Living Room'] },
    { name: 'Tablet', category: 'Electronics', rooms: ['Living Room', 'Bedroom', 'Office'] },
    
    // Kitchen items
    { name: 'Coffee Maker', category: 'Appliances', rooms: ['Kitchen'] },
    { name: 'Blender', category: 'Appliances', rooms: ['Kitchen'] },
    { name: 'Toaster', category: 'Appliances', rooms: ['Kitchen'] },
    { name: 'Microwave', category: 'Appliances', rooms: ['Kitchen'] },
    { name: 'Coffee Mug', category: 'Kitchen', rooms: ['Kitchen', 'Office'] },
    { name: 'Wine Glass', category: 'Kitchen', rooms: ['Kitchen', 'Living Room'] },
    { name: 'Cutting Board', category: 'Kitchen', rooms: ['Kitchen'] },
    { name: 'Kitchen Knife', category: 'Kitchen', rooms: ['Kitchen'] },
    
    // Furniture
    { name: 'Office Chair', category: 'Furniture', rooms: ['Office', 'Bedroom'] },
    { name: 'Desk Lamp', category: 'Furniture', rooms: ['Office', 'Bedroom'] },
    { name: 'Bookshelf', category: 'Furniture', rooms: ['Living Room', 'Office', 'Bedroom'] },
    { name: 'Coffee Table', category: 'Furniture', rooms: ['Living Room'] },
    { name: 'Dining Chair', category: 'Furniture', rooms: ['Kitchen', 'Living Room'] },
    { name: 'Bed Frame', category: 'Furniture', rooms: ['Bedroom'] },
    { name: 'Nightstand', category: 'Furniture', rooms: ['Bedroom'] },
    { name: 'Sofa', category: 'Furniture', rooms: ['Living Room'] },
    
    // Decorative
    { name: 'Picture Frame', category: 'Decorative', rooms: ['Living Room', 'Bedroom', 'Office'] },
    { name: 'Plant Pot', category: 'Decorative', rooms: ['Living Room', 'Bedroom', 'Kitchen', 'Office'] },
    { name: 'Candle', category: 'Decorative', rooms: ['Living Room', 'Bedroom', 'Bathroom'] },
    { name: 'Vase', category: 'Decorative', rooms: ['Living Room', 'Kitchen'] },
    { name: 'Mirror', category: 'Decorative', rooms: ['Bathroom', 'Bedroom', 'Living Room'] },
    
    // Clothing & Personal
    { name: 'Sneakers', category: 'Clothing', rooms: ['Bedroom', 'Garage'] },
    { name: 'Jacket', category: 'Clothing', rooms: ['Bedroom'] },
    { name: 'Watch', category: 'Electronics', rooms: ['Bedroom'] },
    { name: 'Sunglasses', category: 'Clothing', rooms: ['Bedroom', 'Living Room'] },
    { name: 'Backpack', category: 'Clothing', rooms: ['Bedroom', 'Office'] },
    
    // Books & Media
    { name: 'Book', category: 'Books', rooms: ['Living Room', 'Bedroom', 'Office'] },
    { name: 'Magazine', category: 'Books', rooms: ['Living Room', 'Bathroom'] },
    { name: 'Vinyl Record', category: 'Books', rooms: ['Living Room', 'Bedroom'] },
    
    // Sports & Fitness
    { name: 'Yoga Mat', category: 'Sports', rooms: ['Bedroom', 'Living Room'] },
    { name: 'Dumbbells', category: 'Sports', rooms: ['Garage', 'Bedroom'] },
    { name: 'Tennis Racket', category: 'Sports', rooms: ['Garage', 'Bedroom'] },
    
    // Tools & Garage
    { name: 'Toolbox', category: 'Tools', rooms: ['Garage'] },
    { name: 'Drill', category: 'Tools', rooms: ['Garage'] },
    { name: 'Bicycle', category: 'Sports', rooms: ['Garage'] },
  ];

  // Simulate intelligent object detection
  const detectedObject = objectDatabase[Math.floor(Math.random() * objectDatabase.length)];
  const possibleRooms = detectedObject.rooms;
  const detectedRoom = possibleRooms[Math.floor(Math.random() * possibleRooms.length)];

  // Add some randomness to make it feel more realistic
  const confidence = 0.75 + Math.random() * 0.2; // Between 75-95% confidence

  // Sometimes detect multiple objects
  const additionalObjects = [];
  if (Math.random() > 0.6) {
    const secondObject = objectDatabase[Math.floor(Math.random() * objectDatabase.length)];
    additionalObjects.push({
      name: secondObject.name,
      confidence: 0.6 + Math.random() * 0.2,
      category: secondObject.category
    });
  }

  const allObjects = [
    {
      name: detectedObject.name,
      confidence,
      category: detectedObject.category
    },
    ...additionalObjects
  ];

  return {
    objects: allObjects,
    room: detectedRoom,
    suggestedName: detectedObject.name,
    suggestedCategory: detectedObject.category,
  };
};

export const generateItemSuggestions = (
  query: string,
  rooms: Room[],
  categories: Category[]
): Array<{ name: string; room: string; category: string }> => {
  const suggestions = [
    { name: 'MacBook Pro', room: 'Office', category: 'Electronics' },
    { name: 'Coffee Table', room: 'Living Room', category: 'Furniture' },
    { name: 'Instant Pot', room: 'Kitchen', category: 'Appliances' },
    { name: 'Running Shoes', room: 'Bedroom', category: 'Clothing' },
    { name: 'Gaming Chair', room: 'Office', category: 'Furniture' },
    { name: 'Smart TV', room: 'Living Room', category: 'Electronics' },
    { name: 'Coffee Maker', room: 'Kitchen', category: 'Appliances' },
    { name: 'Yoga Mat', room: 'Bedroom', category: 'Sports' },
  ];

  return suggestions.filter(item =>
    item.name.toLowerCase().includes(query.toLowerCase())
  ).slice(0, 3);
};