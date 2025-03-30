import React from 'react';
import { Box } from '@mui/material';

interface CityModelProps {
  className?: string;
}

/**
 * A static image representation of the city waste management model
 */
const CityModel: React.FC<CityModelProps> = ({ className }) => {
  return (
    <Box 
      className={className}
      sx={{ 
        position: 'relative',
        width: '100%',
        height: '100%',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
        borderRadius: 2,
        boxShadow: 3,
      }}
    >
      <img 
        src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRPHoS2IrQG-XZ5f8JcX2F0_P1jRa3kKf4Pxw&usqp=CAU"
        alt="Smart city waste management visualization with buildings showing fill levels"
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
        }}
      />
    </Box>
  );
};

export default CityModel; 