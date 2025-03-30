import React, { useState, useRef } from 'react';
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  Avatar,
  IconButton,
  CircularProgress,
  Stack,
  Divider,
  useTheme,
  alpha,
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import PersonIcon from '@mui/icons-material/Person';
import CloseIcon from '@mui/icons-material/Close';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import RecyclingIcon from '@mui/icons-material/Recycling';

// Types for the chat messages
type MessageType = 'text' | 'image' | 'classification';

interface ChatMessage {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  type: MessageType;
  imageUrl?: string;
  classification?: {
    type: string;
    confidence: number;
    recyclable: boolean;
    instructions?: string;
  };
  timestamp: Date;
}

interface WasteClassifierChatbotProps {
  onClose?: () => void;
}

const WasteClassifierChatbot: React.FC<WasteClassifierChatbotProps> = ({ onClose }) => {
  const theme = useTheme();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      text: 'Hi! I can help identify your waste type. Upload a photo or describe the waste.',
      sender: 'bot',
      type: 'text',
      timestamp: new Date(),
    },
  ]);
  const [newMessage, setNewMessage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Mock waste classification results
  const mockWasteTypes = [
    { type: 'Plastic', instructions: 'Rinse container and place in the recycling bin.' },
    { type: 'Paper', instructions: 'Flatten cardboard and place in the recycling bin.' },
    { type: 'Glass', instructions: 'Rinse container and place in the glass recycling bin.' },
    { type: 'Metal', instructions: 'Rinse container and place in the recycling bin.' },
    { type: 'Electronic', instructions: 'Take to an e-waste collection center.' },
    { type: 'Organic', instructions: 'Place in compost or green waste bin.' },
    { type: 'Hazardous', instructions: 'Take to a hazardous waste facility. DO NOT place in regular trash.' },
    { type: 'Mixed', instructions: 'Separate components if possible, otherwise place in general waste.' },
  ];

  // Scroll to bottom of chat when messages change
  React.useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = () => {
    if (newMessage.trim() === '') return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      text: newMessage,
      sender: 'user',
      type: 'text',
      timestamp: new Date(),
    };

    setMessages((prevMessages) => [...prevMessages, userMessage]);
    setNewMessage('');
    
    // Process the text message to identify waste type
    setIsProcessing(true);
    
    // Analyze the text message
    analyzeTextMessage(userMessage.text).then(response => {
      setMessages((prevMessages) => [...prevMessages, response]);
      setIsProcessing(false);
    });
  };

  // Analyze text message to identify waste
  const analyzeTextMessage = (text: string): Promise<ChatMessage> => {
    return new Promise((resolve) => {
      // Convert to lowercase for better matching
      const lowerText = text.toLowerCase();
      
      // Check for waste type keywords
      const textHasKeyword = (keywords: string[]): boolean => {
        return keywords.some(keyword => lowerText.includes(keyword));
      };
      
      // Default empty classification
      let classification: {
        type?: string;
        confidence?: number;
        recyclable?: boolean;
        instructions?: string;
      } = {};
      
      // Common descriptive phrases to help identify waste types
      if (textHasKeyword(['plastic', 'bottle', 'container', 'packaging', 'wrapper', 'bag'])) {
        const wasteType = mockWasteTypes.find(w => w.type === 'Plastic');
        if (wasteType) {
          classification = {
            type: wasteType.type,
            confidence: 0.85,
            recyclable: true,
            instructions: wasteType.instructions
          };
        }
      } else if (textHasKeyword(['paper', 'cardboard', 'newspaper', 'magazine', 'box', 'carton'])) {
        const wasteType = mockWasteTypes.find(w => w.type === 'Paper');
        if (wasteType) {
          classification = {
            type: wasteType.type,
            confidence: 0.88,
            recyclable: true,
            instructions: wasteType.instructions
          };
        }
      } else if (textHasKeyword(['glass', 'bottle', 'jar', 'window'])) {
        const wasteType = mockWasteTypes.find(w => w.type === 'Glass');
        if (wasteType) {
          classification = {
            type: wasteType.type,
            confidence: 0.9,
            recyclable: true,
            instructions: wasteType.instructions
          };
        }
      } else if (textHasKeyword(['metal', 'can', 'aluminum', 'tin', 'steel', 'foil'])) {
        const wasteType = mockWasteTypes.find(w => w.type === 'Metal');
        if (wasteType) {
          classification = {
            type: wasteType.type,
            confidence: 0.87,
            recyclable: true,
            instructions: wasteType.instructions
          };
        }
      } else if (textHasKeyword(['electronic', 'device', 'computer', 'phone', 'laptop', 'battery', 'charger', 'cord', 'appliance'])) {
        const wasteType = mockWasteTypes.find(w => w.type === 'Electronic');
        if (wasteType) {
          classification = {
            type: wasteType.type,
            confidence: 0.83,
            recyclable: false,
            instructions: wasteType.instructions
          };
        }
      } else if (textHasKeyword(['food', 'organic', 'vegetable', 'fruit', 'leftover', 'garden', 'leaf', 'plant', 'compost'])) {
        const wasteType = mockWasteTypes.find(w => w.type === 'Organic');
        if (wasteType) {
          classification = {
            type: wasteType.type,
            confidence: 0.89,
            recyclable: false,
            instructions: wasteType.instructions
          };
        }
      } else if (textHasKeyword(['hazardous', 'chemical', 'paint', 'oil', 'solvent', 'cleaner', 'toxic', 'poison'])) {
        const wasteType = mockWasteTypes.find(w => w.type === 'Hazardous');
        if (wasteType) {
          classification = {
            type: wasteType.type,
            confidence: 0.82,
            recyclable: false,
            instructions: wasteType.instructions
          };
        }
      }
      
      // If we identified a waste type, return classification response
      if (classification.type && classification.confidence !== undefined && 
          classification.recyclable !== undefined && classification.instructions) {
        setTimeout(() => {
          resolve({
            id: Date.now().toString(),
            text: `Based on your description, this appears to be: ${classification.type}`,
            sender: 'bot',
            type: 'classification',
            classification: {
              type: classification.type as string,
              confidence: classification.confidence as number,
              recyclable: classification.recyclable as boolean,
              instructions: classification.instructions as string
            },
            timestamp: new Date()
          });
        }, 1000);
      } else {
        // If no waste type identified, ask for an image
        setTimeout(() => {
          resolve({
            id: Date.now().toString(),
            text: "I couldn't identify the waste type from your description. Please upload an image for more accurate classification.",
            sender: 'bot',
            type: 'text',
            timestamp: new Date()
          });
        }, 1000);
      }
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Create a preview URL
    const imageUrl = URL.createObjectURL(file);

    // Add image message from user
    const imageMessage: ChatMessage = {
      id: Date.now().toString(),
      text: 'Image uploaded',
      sender: 'user',
      type: 'image',
      imageUrl,
      timestamp: new Date(),
    };

    setMessages((prevMessages) => [...prevMessages, imageMessage]);
    
    // Analyze the image
    setIsProcessing(true);
    
    // Create a simple image analyzer
    analyzeImage(imageUrl).then(classification => {
      // AI response with classification
      const classificationMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        text: `I've analyzed your image and detected: ${classification.type}`,
        sender: 'bot',
        type: 'classification',
        classification: {
          type: classification.type,
          confidence: classification.confidence,
          recyclable: classification.recyclable,
          instructions: classification.instructions,
        },
        timestamp: new Date(),
      };

      setMessages((prevMessages) => [...prevMessages, classificationMessage]);
      setIsProcessing(false);
    });

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Simple image analysis based on dominant colors and other visual characteristics
  const analyzeImage = (imageUrl: string): Promise<{
    type: string;
    confidence: number;
    recyclable: boolean;
    instructions: string;
  }> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      img.onload = () => {
        // Create canvas to analyze image
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = img.width;
        canvas.height = img.height;
        
        if (ctx) {
          ctx.drawImage(img, 0, 0, img.width, img.height);
          
          // Get image data for analysis
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const data = imageData.data;
          
          // Calculate average colors
          let totalR = 0, totalG = 0, totalB = 0;
          for (let i = 0; i < data.length; i += 4) {
            totalR += data[i];
            totalG += data[i + 1];
            totalB += data[i + 2];
          }
          
          const pixelCount = data.length / 4;
          const avgR = totalR / pixelCount;
          const avgG = totalG / pixelCount;
          const avgB = totalB / pixelCount;
          
          // Calculate color characteristics
          const brightness = (avgR + avgG + avgB) / 3;
          const isDark = brightness < 128;
          const isGreen = avgG > avgR && avgG > avgB;
          const isBlue = avgB > avgR && avgB > avgG;
          const isBrown = avgR > avgG && avgG > avgB && avgR > 128 && avgG > 64 && avgB < 100;
          const isGray = Math.abs(avgR - avgG) < 20 && Math.abs(avgG - avgB) < 20 && Math.abs(avgR - avgB) < 20;
          
          // Calculate variance (for texture analysis)
          let variance = 0;
          for (let i = 0; i < data.length; i += 4) {
            variance += Math.pow(data[i] - avgR, 2) +
                        Math.pow(data[i + 1] - avgG, 2) +
                        Math.pow(data[i + 2] - avgB, 2);
          }
          variance = Math.sqrt(variance / (pixelCount * 3));
          
          // Perform basic edge detection for shape analysis
          const edgeCount = detectEdges(imageData);
          const edgeDensity = edgeCount / pixelCount;
          
          // Default waste type (fallback)
          const defaultWasteType = mockWasteTypes.find(w => w.type === 'Mixed') || {
            type: 'Mixed',
            instructions: 'Separate components if possible, otherwise place in general waste.'
          };
          
          // Improved heuristic classification based on color, texture, and edges
          let wasteType = defaultWasteType;
          let confidence = 0.75;
          
          // Plastic detection - often blue or clear, smooth texture, moderate edge density
          if ((isBlue || brightness > 200) && variance < 30 && edgeDensity < 0.1) {
            const plasticType = mockWasteTypes.find(w => w.type === 'Plastic');
            if (plasticType) {
              wasteType = plasticType;
              confidence = 0.88 + (Math.random() * 0.1);
            }
          } 
          // Paper detection - often brown or white, medium texture, low edge density
          else if ((isBrown || brightness > 200) && variance > 20 && variance < 50 && edgeDensity < 0.08) {
            const paperType = mockWasteTypes.find(w => w.type === 'Paper');
            if (paperType) {
              wasteType = paperType;
              confidence = 0.9 + (Math.random() * 0.08);
            }
          }
          // Glass detection - reflective, smoothest texture, clear edges
          else if (variance < 15 && brightness > 180 && edgeDensity > 0.05 && edgeDensity < 0.15) {
            const glassType = mockWasteTypes.find(w => w.type === 'Glass');
            if (glassType) {
              wasteType = glassType;
              confidence = 0.87 + (Math.random() * 0.1);
            }
          }
          // Metal detection - shiny, gray, smooth texture, distinct edges
          else if (isGray && variance < 30 && edgeDensity > 0.1) {
            const metalType = mockWasteTypes.find(w => w.type === 'Metal');
            if (metalType) {
              wasteType = metalType;
              confidence = 0.92 + (Math.random() * 0.07);
            }
          }
          // Electronic detection - high variance, complex patterns, high edge count
          else if (variance > 60 && edgeDensity > 0.2) {
            const electronicType = mockWasteTypes.find(w => w.type === 'Electronic');
            if (electronicType) {
              wasteType = electronicType;
              confidence = 0.82 + (Math.random() * 0.1);
            }
          }
          // Organic detection - mostly green or brown, natural texture
          else if ((isGreen || isBrown) && variance > 40) {
            const organicType = mockWasteTypes.find(w => w.type === 'Organic');
            if (organicType) {
              wasteType = organicType;
              confidence = 0.85 + (Math.random() * 0.1);
            }
          }
          // Hazardous detection - often dark, distinctive colors, warning symbols
          else if (isDark && variance > 50 && edgeDensity > 0.15) {
            const hazardousType = mockWasteTypes.find(w => w.type === 'Hazardous');
            if (hazardousType) {
              wasteType = hazardousType;
              confidence = 0.79 + (Math.random() * 0.1);
            }
          }
          
          const isRecyclable = ['Plastic', 'Paper', 'Glass', 'Metal'].includes(wasteType.type);
          
          // Delay to simulate processing time
          setTimeout(() => {
            resolve({
              type: wasteType.type,
              confidence: confidence,
              recyclable: isRecyclable,
              instructions: wasteType.instructions
            });
          }, 1500);
        } else {
          // Fallback if canvas context fails
          const fallbackType = mockWasteTypes.find(w => w.type === 'Mixed') || {
            type: 'Mixed',
            instructions: 'Separate components if possible, otherwise place in general waste.'
          };
          
          resolve({
            type: fallbackType.type,
            confidence: 0.7,
            recyclable: false,
            instructions: fallbackType.instructions
          });
        }
      };
      
      // Handle image load errors
      img.onerror = () => {
        const fallbackType = mockWasteTypes.find(w => w.type === 'Mixed') || {
          type: 'Mixed',
          instructions: 'Separate components if possible, otherwise place in general waste.'
        };
        
        resolve({
          type: fallbackType.type,
          confidence: 0.7,
          recyclable: false,
          instructions: fallbackType.instructions
        });
      };
      
      img.src = imageUrl;
    });
  };
  
  // Simple edge detection algorithm using Sobel operator
  const detectEdges = (imageData: ImageData): number => {
    const width = imageData.width;
    const height = imageData.height;
    const data = imageData.data;
    let edgeCount = 0;
    
    // For each pixel (excluding borders)
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        // Get pixel position
        const pos = (y * width + x) * 4;
        
        // Get surrounding pixels
        const topLeft = ((y - 1) * width + (x - 1)) * 4;
        const top = ((y - 1) * width + x) * 4;
        const topRight = ((y - 1) * width + (x + 1)) * 4;
        const left = (y * width + (x - 1)) * 4;
        const right = (y * width + (x + 1)) * 4;
        const bottomLeft = ((y + 1) * width + (x - 1)) * 4;
        const bottom = ((y + 1) * width + x) * 4;
        const bottomRight = ((y + 1) * width + (x + 1)) * 4;
        
        // Calculate intensity of each pixel (grayscale)
        const grayTopLeft = (data[topLeft] + data[topLeft + 1] + data[topLeft + 2]) / 3;
        const grayTop = (data[top] + data[top + 1] + data[top + 2]) / 3;
        const grayTopRight = (data[topRight] + data[topRight + 1] + data[topRight + 2]) / 3;
        const grayLeft = (data[left] + data[left + 1] + data[left + 2]) / 3;
        const grayRight = (data[right] + data[right + 1] + data[right + 2]) / 3;
        const grayBottomLeft = (data[bottomLeft] + data[bottomLeft + 1] + data[bottomLeft + 2]) / 3;
        const grayBottom = (data[bottom] + data[bottom + 1] + data[bottom + 2]) / 3;
        const grayBottomRight = (data[bottomRight] + data[bottomRight + 1] + data[bottomRight + 2]) / 3;
        
        // Sobel operator for edge detection
        const gradientX = grayTopRight + 2 * grayRight + grayBottomRight - grayTopLeft - 2 * grayLeft - grayBottomLeft;
        const gradientY = grayBottomLeft + 2 * grayBottom + grayBottomRight - grayTopLeft - 2 * grayTop - grayTopRight;
        
        // Calculate gradient magnitude
        const gradientMagnitude = Math.sqrt(gradientX * gradientX + gradientY * gradientY);
        
        // Count edge pixels (those above threshold)
        if (gradientMagnitude > 30) {
          edgeCount++;
        }
      }
    }
    
    return edgeCount;
  };

  const handleClearChat = () => {
    setMessages([
      {
        id: '1',
        text: 'Hi! I can help identify your waste type. Upload a photo or describe the waste.',
        sender: 'bot',
        type: 'text',
        timestamp: new Date(),
      },
    ]);
  };

  return (
    <Paper
      elevation={3}
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        borderRadius: 2,
        overflow: 'hidden',
      }}
    >
      {/* Chat Header */}
      <Box
        sx={{
          p: 2,
          bgcolor: alpha(theme.palette.primary.main, 0.1),
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: `1px solid ${theme.palette.divider}`,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Avatar sx={{ bgcolor: theme.palette.primary.main, mr: 1.5 }}>
            <RecyclingIcon />
          </Avatar>
          <Typography variant="h6" fontWeight="bold">
            Waste Classifier
          </Typography>
        </Box>
        <Box>
          <IconButton size="small" onClick={handleClearChat} sx={{ mr: 1 }}>
            <DeleteSweepIcon />
          </IconButton>
          {onClose && (
            <IconButton size="small" onClick={onClose}>
              <CloseIcon />
            </IconButton>
          )}
        </Box>
      </Box>

      {/* Chat Messages */}
      <Box
        ref={chatContainerRef}
        sx={{
          flexGrow: 1,
          overflowY: 'auto',
          p: 2,
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
        }}
      >
        {messages.map((message) => (
          <Box
            key={message.id}
            sx={{
              alignSelf: message.sender === 'user' ? 'flex-end' : 'flex-start',
              maxWidth: '80%',
            }}
          >
            <Box
              sx={{
                display: 'flex',
                flexDirection: message.sender === 'user' ? 'row-reverse' : 'row',
                alignItems: 'flex-start',
                gap: 1,
              }}
            >
              <Avatar
                sx={{
                  bgcolor: message.sender === 'user' ? 'primary.main' : 'secondary.main',
                  width: 36,
                  height: 36,
                }}
              >
                {message.sender === 'user' ? <PersonIcon /> : <SmartToyIcon />}
              </Avatar>
              
              <Paper
                elevation={1}
                sx={{
                  p: 2,
                  borderRadius: 2,
                  bgcolor: message.sender === 'user' 
                    ? alpha(theme.palette.primary.main, 0.1) 
                    : 'background.paper',
                  maxWidth: '100%',
                }}
              >
                {message.type === 'text' && (
                  <Typography variant="body1">{message.text}</Typography>
                )}

                {message.type === 'image' && (
                  <Box>
                    <Typography variant="body2" color="text.secondary" mb={1}>
                      {message.text}
                    </Typography>
                    <Box
                      component="img"
                      src={message.imageUrl}
                      alt="Uploaded waste"
                      sx={{
                        maxWidth: '100%',
                        maxHeight: 200,
                        objectFit: 'contain',
                        borderRadius: 1,
                      }}
                    />
                  </Box>
                )}

                {message.type === 'classification' && message.classification && (
                  <Box>
                    <Typography variant="body1" mb={1}>
                      {message.text}
                    </Typography>
                    <Box
                      sx={{
                        mt: 1,
                        p: 2,
                        bgcolor: alpha(
                          message.classification.recyclable 
                            ? theme.palette.success.main 
                            : theme.palette.warning.main,
                          0.1
                        ),
                        borderRadius: 1,
                        border: `1px solid ${alpha(
                          message.classification.recyclable 
                            ? theme.palette.success.main 
                            : theme.palette.warning.main,
                          0.3
                        )}`,
                      }}
                    >
                      <Stack direction="row" justifyContent="space-between" mb={1}>
                        <Typography variant="subtitle2">Type:</Typography>
                        <Typography fontWeight="bold">{message.classification.type}</Typography>
                      </Stack>
                      <Stack direction="row" justifyContent="space-between" mb={1}>
                        <Typography variant="subtitle2">Confidence:</Typography>
                        <Typography fontWeight="bold">{(message.classification.confidence * 100).toFixed(0)}%</Typography>
                      </Stack>
                      <Stack direction="row" justifyContent="space-between" mb={1}>
                        <Typography variant="subtitle2">Recyclable:</Typography>
                        <Typography 
                          fontWeight="bold"
                          color={message.classification.recyclable ? 'success.main' : 'warning.main'}
                        >
                          {message.classification.recyclable ? 'Yes' : 'No'}
                        </Typography>
                      </Stack>
                      <Divider sx={{ my: 1 }} />
                      <Typography variant="subtitle2" mb={0.5}>Instructions:</Typography>
                      <Typography variant="body2">
                        {message.classification.instructions}
                      </Typography>
                    </Box>
                  </Box>
                )}
                
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1, textAlign: 'right' }}>
                  {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Typography>
              </Paper>
            </Box>
          </Box>
        ))}
        
        {isProcessing && (
          <Box
            sx={{
              alignSelf: 'flex-start',
              display: 'flex',
              alignItems: 'center',
              gap: 1,
            }}
          >
            <Avatar
              sx={{
                bgcolor: 'secondary.main',
                width: 36,
                height: 36,
              }}
            >
              <SmartToyIcon />
            </Avatar>
            <Paper
              elevation={1}
              sx={{
                p: 2,
                borderRadius: 2,
                bgcolor: 'background.paper',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CircularProgress size={16} />
                <Typography variant="body2">Processing...</Typography>
              </Box>
            </Paper>
          </Box>
        )}
      </Box>

      {/* Message Input */}
      <Box
        sx={{
          p: 2,
          borderTop: `1px solid ${theme.palette.divider}`,
          bgcolor: 'background.paper',
        }}
      >
        <Box
          component="form"
          sx={{
            display: 'flex',
            gap: 1,
            alignItems: 'center',
          }}
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
        >
          <TextField
            fullWidth
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your message..."
            variant="outlined"
            size="small"
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 8,
              },
            }}
          />
          
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handleFileUpload}
          />
          
          <IconButton
            color="primary"
            onClick={() => fileInputRef.current?.click()}
            sx={{ bgcolor: alpha(theme.palette.primary.main, 0.1) }}
          >
            <PhotoCameraIcon />
          </IconButton>
          
          <Button
            variant="contained"
            color="primary"
            onClick={handleSendMessage}
            disabled={newMessage.trim() === ''}
            sx={{
              borderRadius: 8,
              px: 2,
              minWidth: 0,
            }}
          >
            <SendIcon />
          </Button>
        </Box>
      </Box>
    </Paper>
  );
};

export default WasteClassifierChatbot; 