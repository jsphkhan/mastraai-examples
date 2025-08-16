#!/usr/bin/env node

const readline = require('readline');

// Create readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: '> '
});

// Store conversation history
const conversation = [];

// Simple response generator
function generateResponse(userInput) {
  const input = userInput.toLowerCase();
  
  if (input.includes('hello') || input.includes('hi')) {
    return 'Hello! How can I help you today?';
  }
  
  if (input.includes('how are you')) {
    return 'I\'m doing well, thank you for asking!';
  }
  
  if (input.includes('time')) {
    return `The current time is ${new Date().toLocaleTimeString()}`;
  }
  
  if (input.includes('date')) {
    return `Today is ${new Date().toLocaleDateString()}`;
  }
  
  if (input.includes('weather')) {
    return 'I can\'t check the weather, but I hope it\'s nice where you are!';
  }
  
  if (input.includes('thank')) {
    return 'You\'re welcome! Is there anything else I can help with?';
  }
  
  if (input.includes('bye') || input.includes('goodbye')) {
    return 'Goodbye! Have a great day!';
  }
  
  // Default responses
  const responses = [
    'That\'s interesting! Tell me more.',
    'I understand. How can I assist you?',
    'Thanks for sharing that with me.',
    'I\'m here to help. What would you like to explore?',
    'That\'s a great question. Let me think about it.',
    'I appreciate your input. How can I be of service?'
  ];
  
  return responses[Math.floor(Math.random() * responses.length)];
}

// Handle user input
function handleInput(input) {
  const trimmedInput = input.trim();
  
  if (trimmedInput === '') {
    rl.prompt();
    return;
  }
  
  // Check for special commands
  if (trimmedInput === 'quit' || trimmedInput === 'exit') {
    console.log('\n👋 Goodbye! Thanks for chatting!');
    rl.close();
    return;
  }
  
  if (trimmedInput === 'history') {
    showHistory();
    rl.prompt();
    return;
  }
  
  if (trimmedInput === 'clear') {
    conversation.length = 0;
    console.log('\n🗑️  Conversation history cleared.');
    rl.prompt();
    return;
  }
  
  if (trimmedInput === 'help') {
    showHelp();
    rl.prompt();
    return;
  }
  
  // Process regular message
  processMessage(trimmedInput);
}

// Process user message and generate response
function processMessage(userMessage) {
  // Add user message to history
  conversation.push({
    role: 'user',
    content: userMessage,
    timestamp: new Date()
  });
  
  // Display user message
  console.log(`\n👤 You: ${userMessage}`);
  
  // Generate and display AI response
  const aiResponse = generateResponse(userMessage);
  
  // Add AI response to history
  conversation.push({
    role: 'assistant',
    content: aiResponse,
    timestamp: new Date()
  });
  
  // Display AI response
  console.log(`\n🤖 AI: ${aiResponse}\n`);
  
  // Show prompt for next input
  rl.prompt();
}

// Show conversation history
function showHistory() {
  if (conversation.length === 0) {
    console.log('\n📝 No conversation history yet.');
    return;
  }
  
  console.log('\n📝 Conversation History:');
  console.log('=' .repeat(50));
  
  conversation.forEach((message, index) => {
    const time = message.timestamp.toLocaleTimeString();
    const role = message.role === 'user' ? '👤 You' : '🤖 AI';
    console.log(`[${time}] ${role}: ${message.content}`);
    
    if (index < conversation.length - 1) {
      console.log('-'.repeat(30));
    }
  });
  
  console.log('=' .repeat(50));
}

// Show help information
function showHelp() {
  console.log('\n📚 Available Commands:');
  console.log('• Type your message to chat');
  console.log('• "history" - Show conversation history');
  console.log('• "clear" - Clear conversation history');
  console.log('• "help" - Show this help message');
  console.log('• "quit" or "exit" - End conversation');
  console.log('• Press Ctrl+C to force quit\n');
}

// Start the chat
function startChat() {
  console.log('🤖 Welcome to Simple Chat!');
  console.log('Type your message and press Enter. Type "quit" or "exit" to end.');
  console.log('Type "help" for available commands.\n');
  
  rl.prompt();
  
  // Listen for user input
  rl.on('line', handleInput);
  
  // Handle graceful shutdown
  rl.on('close', () => {
    console.log('\n👋 Chat ended. Goodbye!');
    process.exit(0);
  });
}

// Start the chat application
startChat();
