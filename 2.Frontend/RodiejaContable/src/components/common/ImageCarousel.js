import React from 'react';
import { Carousel, Image } from 'antd';
import { parseImageUrls } from '../../utils/imageUtils';

const ImageCarousel = ({ imageUrlString, alt, style, width, height, borderRadius, preview = true }) => {
  const imageUrls = parseImageUrls(imageUrlString);

  if (imageUrls.length === 0) {
    return (
      <Image
        src="https://via.placeholder.com/300x200?text=Sin+imagen"
        alt={alt}
        style={{ width: width || '100%', height: height || 'auto', objectFit: 'cover', borderRadius: borderRadius || '8px' }}
        preview={false}
      />
    );
  }

  if (imageUrls.length === 1) {
    return (
      <Image
        src={imageUrls[0]}
        alt={alt}
        style={{ width: width || '100%', height: height || 'auto', objectFit: 'cover', borderRadius: borderRadius || '8px' }}
        fallback="https://via.placeholder.com/300x200?text=Imagen+no+disponible"
        preview={preview}
      />
    );
  }

  return (
    <div style={{ position: 'relative', width: width || '100%', height: height || 'auto', borderRadius: borderRadius || '8px', overflow: 'hidden', ...style }}>
      <Carousel arrows dotPosition="bottom" style={{ width: '100%', height: '100%' }}>
        {imageUrls.map((url, index) => (
          <div key={index} style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Image
              src={url}
              alt={`${alt} - ${index + 1}`}
              style={{ width: '100%', height: height || '100%', objectFit: 'cover' }}
              fallback="https://via.placeholder.com/300x200?text=Imagen+no+disponible"
              preview={preview}
            />
          </div>
        ))}
      </Carousel>
      {/* Estilos para que los arrows del Carousel de Ant Design se vean sobre la imagen */}
      <style>{`
        .ant-carousel .slick-prev,
        .ant-carousel .slick-next,
        .ant-carousel .slick-prev:hover,
        .ant-carousel .slick-next:hover {
          color: white !important;
          background: rgba(0, 0, 0, 0.4) !important;
          border-radius: 50% !important;
          padding: 8px !important;
          width: 30px !important;
          height: 30px !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          z-index: 2 !important;
        }
        .ant-carousel .slick-prev { left: 10px !important; }
        .ant-carousel .slick-next { right: 10px !important; }
        .ant-carousel .slick-prev::before,
        .ant-carousel .slick-next::before {
          display: none !important;
        }
      `}</style>
    </div>
  );
};

export default ImageCarousel;
