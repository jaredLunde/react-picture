import React from 'react'
import PropTypes from 'prop-types'
import emptyObj from 'empty/object'
import {callIfExists} from '@render-props/utils'


export const fit = (width, height, intoWidth, intoHeight) => {
  const widthFits = width <= intoWidth
  const heightFits = height <= intoHeight

  if (widthFits && heightFits) {
    return {width, height}
  }

  let rat
  if (widthFits && !heightFits) {
    rat = intoHeight / height
  } else if (!widthFits && heightFits) {
    rat = intoWidth / width
  } else {
    rat = Math.min(intoWidth / width, intoHeight / height)
  }

  width = isNaN(width) ? '100%' : rat * width
  height = isNaN(height) ? '100%' : rat * height

  return {width, height}
}


export const fill = (width, height, intoWidth, intoHeight) => {
  if (intoWidth === Infinity) {
    const realHeight = intoHeight === Infinity ? '100%' : intoHeight
    width = realHeight === '100%' ? '100%' : (intoHeight / height) * width
    height = realHeight
  }
  else if (intoHeight === Infinity) {
    height = (intoWidth / width) * height
    width = intoWidth
  }
  else {
    const rat = Math.max(intoWidth / width, intoHeight / height)
    width = rat * width
    height = rat * height
  }

  return {width: width || void 0, height: height || void 0}
}


const getSize = (
  {srcset, scale, width, height},
  {defaultImg, offsetWidth, offsetHeight}
) => {
  if (scale === 'fit') {
    return fit(
      defaultImg.width,
      defaultImg.height,
      offsetWidth || width || Infinity,
      offsetHeight || height || Infinity
    )
  } else if (scale === 'fill'){
    return fill(
      defaultImg.width,
      defaultImg.height,
      offsetWidth || width || Infinity,
      offsetHeight || height || Infinity
    )
  }

  return {width: defaultImg.width, height: defaultImg.height}
}


export default class Picture extends React.PureComponent {
  static propTypes = {
    srcset: PropTypes.arrayOf(
      PropTypes.shape({
        src: PropTypes.string,
        mime: PropTypes.string,
        width: PropTypes.number,
        height: PropTypes.number
      })
    ).isRequired,
    width: PropTypes.number,
    height: PropTypes.number,
    scale: PropTypes.oneOf(['fit', 'fill', 'none']).isRequired,
    onChange: PropTypes.func,
  }

  static defaultProps = {
    scale: 'fill',
  }

  state = {
    defaultImg: null,
    webpImg: null,
  }

  picture = null

  constructor (props) {
    super(props)
    this.state = this.findImg(props)
  }

  componentDidMount () {
    callIfExists(this.props.onChange, this.state)
  }

  componentDidUpdate (
    {width, height, srcset, scale, onChange},
    {defaultImg, webpImg, offsetWidth, offsetHeight}
  ) {
    if (
      srcset !== this.props.srcset
      || scale !== this.props.scale
      || width !== this.props.width
      || height !== this.props.height
    ) {
      this.calculateSize({
        srcset: this.props.srcset,
        width: this.props.width,
        height: this.props.height
      })
    }

    if (
      defaultImg !== this.state.defaultImg
      || webpImg !== this.state.webpImg
      || offsetWidth !== this.state.offsetWidth
      || offsetHeight !== this.state.offsetHeight
      || width !== this.props.width
      || height !== this.props.height
    ) {
      callIfExists(this.props.onChange, this.state)
    }
  }

  setRef = el => {
    this.picture = el
    
    if (this.props.innerRef !== void 0) {
      this.props.innerRef(el)
    }
  }

  findImg ({srcset, width, height}) {
    let offsetWidth = width || 0
    let offsetHeight = height || 0
    let pictureWidth = width || 0

    if (this.picture) {
      if (!pictureWidth) {
        pictureWidth = offsetWidth = this.picture.offsetWidth
      }

      if (!offsetHeight && !pictureWidth) {
        offsetHeight = this.picture.offsetHeight
      }
    }

    let latestDefault
    let latestDefaultWidth = Infinity
    let latestWebp
    let latestWebpWidth = Infinity
    let maxDefault
    let maxDefaultWidth = 0
    let maxWebp
    let maxWebpWidth = 0

    for (let x = 0; x < srcset.length; x++) {
      const img = srcset[x]
      const {width, mime} = img

      if (pictureWidth <= width) {
        if (mime === 'image/webm') {
          latestWebpWidth = Math.min(width, latestWebpWidth)

          if (width === latestWebpWidth) {
            latestWebp = img
          }
        }
        else {
          latestDefaultWidth = Math.min(width, latestDefaultWidth)

          if (width === latestDefaultWidth) {
            latestDefault = img
          }
        }
      }
      else {
        if (mime === 'image/webm') {
          maxWebpWidth = Math.max(width, maxWebpWidth)

          if (width === maxWebpWidth) {
            maxWebp = img
          }
        }
        else {
          maxDefaultWidth = Math.max(width, maxDefaultWidth)

          if (width === maxDefaultWidth) {
            maxDefault = img
          }
        }
      }
    }

    latestDefault = latestDefault || maxDefault
    latestWebp = latestWebp || maxWebp

    return {
      defaultImg: latestDefault,
      webpImg: latestWebp,
      offsetWidth,
      offsetHeight,
    }
  }

  calculateSize (props) {
    let prevState

    this.setState(
      ({defaultImg, webpImg, offsetWidth, offsetHeight}, prevProps) => {
        prevState = {defaultImg, webpImg, offsetWidth, offsetHeight}
        const newImgs = this.findImg(props || prevProps)

        if (props.srcset === prevProps.srcset) {
          if (newImgs.webpImg && webpImg && newImgs.webpImg.width < webpImg.width) {
            newImgs.webpImg = webpImg
          }

          if (newImgs.defaultImg && defaultImg && newImgs.defaultImg.width < defaultImg.width) {
            newImgs.defaultImg = defaultImg
          }
        }

        if (
          defaultImg !== newImgs.defaultImg
          || webpImg !== newImgs.webpImg
          || offsetWidth !== newImgs.offsetWidth
          || offsetHeight !== newImgs.offsetHeight
        ) {
          return newImgs
        }
        else {
          return null
        }
      }
    )
  }

  get webpSrc () {
    return this.state.webpImg && (
      <source type='image/webp' srcSet={this.state.webpImg.src}/>
    )
  }

  get defaultSrc () {
    const {defaultImg} = this.state

    return defaultImg && (
      <source type={defaultImg.mime} srcSet={defaultImg.src}/>
    )
  }

  get fallbackSrc () {
    return this.state.defaultImg && <img
      src={this.state.defaultImg.src}
      alt={this.props.alt || this.props.caption}
      width={this.size.width}
      height={this.size.height}
      itemProp={this.props.itemProp}
    />
  }

  render () {
    this.size = getSize(this.props, this.state)
    const {width, height} = this.size
    const {style, className} = this.props

    return (
      <picture
        key={`
          ${this.state.webpSrc && this.state.webpSrc.src}-
          ${this.state.defaultSrc && this.state.defaultSrc.src}
        `}
        style={{display: 'block', width, height, ...(style || emptyObj)}}
        width={width}
        height={height}
        className={className}
        ref={this.setRef}
        data-autosize={!width || !height ? true : false}
        data-strict={width && height ? true : false}
      >
        {this.webpSrc}
        {this.defaultSrc}
        {this.fallbackSrc}
      </picture>
    )
  }
}
