// const API_BASE_URL = "https://pathology.gictelemed.org"  
const API_BASE_URL = "http://localhost:5000"  

let tiff = {}

const getImageInfo = async (imageIdentifier) => {
  let pixelsPerMeter
  
  fetch(`${API_BASE_URL}/info.json?${imageIdentifier}`)
  .then(res => res.json())
  .then(data => {
    console.log('*********** Image data returned ***********')
    console.log(data)
  })
  .catch(err =>{
    console.log("****** an error occured fetching data  ********")
    console.log(err)
  })


  await getImagesInPyramid(imageIdentifier, true)
  
  const [width, height] = [tiff[imageIdentifier].image.maxWidth, tiff[imageIdentifier].image.maxHeight]
  const largestImage = await tiff[imageIdentifier].image.getImage(0)
  const micronsPerPixel = largestImage?.fileDirectory?.ImageDescription?.split("|").find(s => s.includes("MPP")).split("=")[1].trim()
  
  if (micronsPerPixel) {
    pixelsPerMeter = 1 / (parseFloat(micronsPerPixel) * Math.pow(10, -6))
  }

  console.log("**********  Image Information  **************")
  console.log("ImageIdentifier: " +imageIdentifier)
  console.log("Width: " + width)
  console.log("Height: "+ height)
  console.log("PixelsPerMeter: "+pixelsPerMeter)
  console.log("image Info Context")
  console.log(imageInfoContext)
  
  const response = new Response(
    JSON.stringify({
      width,
      height,
      pixelsPerMeter,
      "@context": imageInfoContext,
    }), { status: 200 }
  )
  
  return response
}

const getImagesInPyramid = (imageIdentifier, firstOnly=false) => {
  return new Promise(async (resolve, reject) => {
    tiff[imageIdentifier] = tiff[imageIdentifier] || {}

    try {
      tiff[imageIdentifier].image = tiff[imageIdentifier].image || ( await GeoTIFF.fromUrl(imageIdentifier, { cache: false }) )

      const imageCount = await tiff[imageIdentifier].image.getImageCount()
      if (tiff[imageIdentifier].image.loadedCount !== imageCount) {
        tiff[imageIdentifier].image.loadedCount = 0

        const imagePromises = await Promise.allSettled(Array.from(Array(imageCount - 2), (_, ind) => tiff[imageIdentifier].image.getImage(ind) ))
        tiff[imageIdentifier].image.loadedCount = imagePromises.filter(v => v.status === "fulfilled").length
        if (imagePromises[0].status === "fulfilled") {
          const largestImage = imagePromises[0].value
          const [width, height] = [largestImage.getWidth(), largestImage.getHeight()]
          tiff[imageIdentifier].image.maxWidth = width
          tiff[imageIdentifier].image.maxHeight = height
        } else {
          tiff[imageIdentifier].image.maxWidth = NaN
          tiff[imageIdentifier].image.maxHeight = NaN
        }
        
        resolve()
        return
      }
  
    } catch (e) {
      console.log("Couldn't get images", e)
      reject(e)
    }
  })
}

const getImageIndexByRatio = async (imageId, tileWidthRatio) => {
  
  if (!tiff[imageId].image.imageWidthRatios) {
    tiff[imageId].image.imageWidthRatios = []
  
    for (let imageIndex = 0; imageIndex < tiff[imageId].image.loadedCount; imageIndex++) {
      const imageWidth = (await tiff[imageId].image.getImage(imageIndex)).getWidth()
      const maxImageWidth = tiff[imageId].image.maxWidth
      tiff[imageId].image.imageWidthRatios.push(maxImageWidth / imageWidth)
    } 
  
  }
  
  const sortedRatios = [...tiff[imageId].image.imageWidthRatios].sort((a, b) => a - b).slice(0, -1) // Remove thumbnail from consideration
  
  if (tileWidthRatio > 8) {
    return tiff[imageId].image.imageWidthRatios.indexOf(sortedRatios[sortedRatios.length - 1])
  }
  
  else if (tileWidthRatio <= 2 && tileWidthRatio > 0) {
    return 0 // Return first image for high magnification tiles
  }
  
  else {
    
    if (sortedRatios.length === 3) {
      return tiff[imageId].image.imageWidthRatios.indexOf(sortedRatios[sortedRatios.length - 2])
    }
    
    else if (sortedRatios.length > 3) {
      if (tileWidthRatio > 4) {
        return tiff[imageId].image.imageWidthRatios.indexOf(sortedRatios[sortedRatios.length - 2])
      }
      else {
        return tiff[imageId].image.imageWidthRatios.indexOf(sortedRatios[sortedRatios.length - 3])
      }
    }

  }
}

const getImageThumbnail = async (imageIdentifier, tileParams) => {

  const parsedTileParams = utils.parseTileParams(tileParams)

  const { thumbnailWidthToRender } = parsedTileParams
  if (!Number.isInteger(thumbnailWidthToRender)) {
    console.error("Thumbnail Request missing critical parameters!", thumbnailWidthToRender)
    return
  }

  if (!tiff[imageIdentifier]?.image || tiff[imageIdentifier].image.loadedCount === 0) {
    await getImagesInPyramid(imageIdentifier, false)
  }

  const thumbnailImage = await tiff[imageIdentifier].image.getImage(1)
  const thumbnailHeightToRender = Math.floor(thumbnailImage.getHeight() * thumbnailWidthToRender / thumbnailImage.getWidth())

  let data = await thumbnailImage.readRasters({
    width: thumbnailWidthToRender,
    height: thumbnailHeightToRender
  })

   console.log("******** Getting image thumbnail  *********")

   const [width, height] = [tiff[imageIdentifier].image.maxWidth, tiff[imageIdentifier].image.maxHeight]


   const broken_link = imageIdentifier.split("%2F")
   var slideId =  broken_link.pop()
   slideId = slideId.split("/")
  fileName = slideId.pop()
  folderName = slideId.pop()

  const imageResponse = fetch(`${API_BASE_URL}/thumbnail`,{
    method: "POST",
    headers:{
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      width: thumbnailWidthToRender,
      height: thumbnailHeightToRender,
      originalWidth: width,
      originalHeight: height,
      imageIdentifier: imageIdentifier.split("/").pop() ,
      fileName: fileName,
      folderName : folderName 
    }) 
  })
  // .then(res => res.blob())
  // .then(data =>{
  //   console.log('************ Thumbnail response recieved ************')
  //   console.log(data)
  //   console.log('*****************************************************')
  // })
  // .catch(e =>{
  //   console.log("**********  Error in getting thumbnail  *************")
  //   console.log(e)
  //   console.log('*****************************************************')
  // })


  // const imageResponse = await convertToImage(data, thumbnailWidthToRender, thumbnailHeightToRender)
  return imageResponse
  
}

const getImageTile = async (imageIdentifier, tileParams, url) => {

  const broken_link = imageIdentifier.split("%2F")
  var slideId =  broken_link.pop()
  slideId = slideId.split("/")
  tileParams.fileName = slideId.pop()
  tileParams.folderName = slideId.pop()
  tileParams.url= url

  const imageResponse = fetch(`${API_BASE_URL}/tile`,{
    method: "POST",
    headers:{
      'content-type': 'application/json'
    },
    body: JSON.stringify(tileParams) 
  })


  const parsedTileParams = utils.parseTileParams(tileParams)
  
  const { tileTopX, tileTopY, tileWidth, tileHeight, tileWidthToRender } = parsedTileParams
  
  if (!Number.isInteger(tileTopX) || !Number.isInteger(tileTopY) || !Number.isInteger(tileWidth) || !Number.isInteger(tileHeight) || !Number.isInteger(tileWidthToRender)) {
    console.error("Tile Request missing critical parameters!", tileTopX, tileTopY, tileWidth, tileHeight, tileWidthToRender)
    return
  }

  if (!tiff[imageIdentifier]?.image || tiff[imageIdentifier].image.loadedCount === 0) {
    await getImagesInPyramid(imageIdentifier, false)
  }

  const tileWidthRatio = Math.floor(tileWidth / tileWidthToRender)
  const optimalImageIndex = await getImageIndexByRatio(imageIdentifier, tileWidthRatio)

  const optimalImageInTiff = await tiff[imageIdentifier].image.getImage(optimalImageIndex)
  const optimalImageWidth = optimalImageInTiff.getWidth()
  const optimalImageHeight = optimalImageInTiff.getHeight()
  const tileHeightToRender = Math.floor( tileHeight * tileWidthToRender / tileWidth)

  const { maxWidth, maxHeight } = tiff[imageIdentifier].image

  const tileInImageLeftCoord = Math.floor( tileTopX * optimalImageWidth / maxWidth )
  const tileInImageTopCoord = Math.floor( tileTopY * optimalImageHeight / maxHeight ) 
  const tileInImageRightCoord = Math.floor( (tileTopX + tileWidth) * optimalImageWidth / maxWidth )
  const tileInImageBottomCoord = Math.floor( (tileTopY + tileHeight) * optimalImageHeight / maxHeight )


  console.log("======================================")
  console.table(tileParams)
  console.log(slideId)
  console.log(slideId)
  console.log("*******************************")
  console.log(`tileWidthToRender : ${tileWidthToRender }`)
  console.log(`tileHeightToRender : ${tileHeightToRender }`)
  console.log(`tileInImageLeftCoord : ${tileInImageLeftCoord }`)
  console.log(`tileInImageTopCoord : ${tileInImageTopCoord }`)
  console.log(`tileInImageRightCoord : ${tileInImageRightCoord }`)
  console.log(`tileInImageBottomCoord : ${tileInImageBottomCoord }`)
  console.log("======================================")


  // const data = await optimalImageInTiff.readRasters({
  //   width: tileWidthToRender,
  //   height: tileHeightToRender,
  //   window: [
  //     tileInImageLeftCoord,
  //     tileInImageTopCoord,
  //     tileInImageRightCoord,
  //     tileInImageBottomCoord,
  //   ]
  // })

  // const imageResponse = await convertToImage(data, tileWidthToRender, tileHeightToRender)
  return imageResponse
}

const convertToImage = async (data, width, height) => {
  let imageData = []
  data[0].forEach((val, ind) => {
    imageData.push(val)
    imageData.push(data[1][ind])
    imageData.push(data[2][ind])
    imageData.push(255)
  })

  const cv = new OffscreenCanvas(width, height)
  const ctx = cv.getContext("2d")
  ctx.putImageData( new ImageData(Uint8ClampedArray.from(imageData), width, height), 0, 0 )
  const blob = await cv.convertToBlob({
    type: "image/jpeg",
    quality: 1.0,
  })

  const response = new Response(blob, { status: 200 })
  return response
}