import React, { useEffect, useState, useRef,useCallback } from 'react';
import OpenSeadragon from 'openseadragon';
import html2canvas from 'html2canvas';
import * as Annotorious from '@recogito/annotorious-openseadragon';
import '@recogito/annotorious-openseadragon/dist/annotorious.min.css';


const ImageViewer = () => {
  const viewerRef = useRef(null);
  const [anno, setAnno] = useState(null)
  // const [annotations, setAnnotations] = useState([])



  const viewerObject = useCallback(
    {
      
      initializeViewer: useCallback(() =>{

          if(viewerRef.current) {

          const viewer = OpenSeadragon({
            id: "home",
            prefixUrl: './images/', // Adjust the path to OpenSeadragon assets https://ids.lib.harvard.edu/ids/iiif/47174896/info.json
            tileSources: 'https://media.nga.gov/iiif/public/objects/1/0/6/3/8/2/106382-primary-0-nativeres.ptif/info.json',
            showNavigator: true,
            crossOriginPolicy: "Anonymous",
            // disableSelect: false
          });
  
          const config = {
          };

          const annotate = Annotorious(viewer, config);
          
          // setAnno(annotate)

          // var sampleAnnotation = { 
          //   "@context": "http://www.w3.org/ns/anno.jsonld",
          //   "id": "#07475897-d2eb-4dce-aa12-ecb50771c734",
          //   "type": "Annotation",
          //   "body": [{
          //     "type": "TextualBody",
          //     "value": "Annotation"
          //   }],
          //   "target": {
          //     "selector": {
          //       "type": "FragmentSelector",
          //       "conformsTo": "http://www.w3.org/TR/media-frags/",
          //       "value": "xywh=540,240,180,340"
          //     }
          //   }
          // };
        
          // annotate.addAnnotation(sampleAnnotation); 
          
          // Load annotations in W3C WebAnnotation format
          // annotate.loadAnnotations('annotations.w3c.json');

          const captureScreenshot = () => {
            html2canvas(viewerRef.current, { useCORS: true })
              .then(canvas => {
                const screenshot = canvas.toDataURL('image/png');
                // Do something with the screenshot image
                console.log('Screenshot captured:', screenshot);
              })
              .catch(error => {
                console.error('Error capturing screenshot:', error);
              });
          }

          const screenshotButton = document.createElement('button');
          screenshotButton.textContent = 'Screenshot';
          screenshotButton.style.position = 'absolute';
          screenshotButton.style.top = '10px';
          screenshotButton.style.right = '10px';
          screenshotButton.style.padding = '4px 8px';
          screenshotButton.style.fontSize = '12px';
          screenshotButton.style.background = '#fff';
          screenshotButton.style.color = '#000';
          screenshotButton.style.border = '1px solid #000';
          screenshotButton.style.borderRadius = '4px';
          screenshotButton.addEventListener('click', captureScreenshot);
      
          viewerRef.current.appendChild(screenshotButton);

          viewerRef.current.viewer = viewer;

        }
      },[]),

      destroyViewer: useCallback(() =>{
          if(viewerRef.current){
            viewerRef.destroy()
          }
      },[]),

      captureScreenshot: useCallback(() =>{

      },[])
      
    },[]);


  useEffect(() => {

    viewerObject.initializeViewer()
    return () => {
      viewerObject.destroyViewer()
    };
    
  }, [viewerObject]);

  return ( 
    <>
      <div ref={viewerRef} id="home"> </div>    
    </>

  );
};

export default ImageViewer;

