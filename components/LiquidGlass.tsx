import React from "react";

export default function LiquidGlass({
  width = 384,
  height = 192,
  radius = 32,
  style,
  children,
}: {
  width?: number;
  height?: number;
  radius?: number;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}) {
  return (
    <div style={{ position: "relative", width, height, ...style }}>
      <svg
        width={width}
        height={height}
        style={{ position: "absolute", top: 0, left: 0, zIndex: 0 }}
      >
        <defs>
          <filter id="displacementFilter4" filterUnits="userSpaceOnUse">
            <feImage href="data:image/svg+xml,%3Csvg width='200' height='200' viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Crect x='50' y='50' width='100' height='100' rx='25' fill='%230001' /%3E%3Crect x='50' y='50' width='100' height='100' rx='25' fill='%23FFF' style='filter:blur(5px)' /%3E%3C/svg%3E" x="0%" y="0%" width="100%" height="100%" result="thing9" id="thing9" />
            <feImage href="data:image/svg+xml,%3Csvg width='200' height='200' viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Crect x='50' y='50' width='100' height='100' rx='25' fill='%23FFF1' style='filter:blur(15px)' /%3E%3C/svg%3E" x="0%" y="0%" width="100%" height="100%" result="thing0" id="thing0" />
            <feImage href="data:image/svg+xml,%3Csvg width='200' height='200' viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Crect x='50' y='50' width='100' height='100' rx='25' fill='%23000' /%3E%3C/svg%3E" x="0%" y="0%" width="100%" height="100%" result="thing1" id="thing1" />
            <feImage href="data:image/svg+xml,%3Csvg width='200' height='200' viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cdefs%3E%3ClinearGradient id='gradient1' x1='0%25' y1='0%25' x2='100%25' y2='0%25'%3E%3Cstop offset='0%25' stop-color='%23000'/%3E%3Cstop offset='100%25' stop-color='%2300F'/%3E%3C/linearGradient%3E%3ClinearGradient id='gradient2' x1='0%25' y1='0%25' x2='0%25' y2='100%25'%3E%3Cstop offset='0%25' stop-color='%23000'/%3E%3Cstop offset='100%25' stop-color='%230F0'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect x='0' y='0' width='200' height='200' rx='25' fill='%237F7F7F' /%3E%3Crect x='50' y='50' width='100' height='100' rx='25' fill='%23000' /%3E%3Crect x='50' y='50' width='100' height='100' rx='25' fill='url(%23gradient1)' style='mix-blend-mode: screen' /%3E%3Crect x='50' y='50' width='100' height='100' rx='25' fill='url(%23gradient2)' style='mix-blend-mode: screen' /%3E%3Crect x='50' y='50' width='100' height='100' rx='25' fill='%237F7F7FBB' style='filter:blur(5px)' /%3E%3C/svg%3E" x="0%" y="0%" width="100%" height="100%" result="thing2" id="thing2" />
            <feGaussianBlur  stdDeviation="0.7" id="preblur" in="SourceGraphic" result="preblur" />
            <feDisplacementMap
              id="dispR"
              in2="thing2"
              in="preblur"
              scale="-148"
              xChannelSelector="B"
              yChannelSelector="G"
              />
              <feColorMatrix
              type="matrix"
              values="1 0 0 0 0
                      0 0 0 0 0
                      0 0 0 0 0
                      0 0 0 1 0"  result="disp1" />
            <feDisplacementMap
              id="dispG"
              in2="thing2"
              in="preblur"
              scale="-150"
              xChannelSelector="B"
              yChannelSelector="G"
               />
              <feColorMatrix
              type="matrix"
              values="0 0 0 0 0
                      0 1 0 0 0
                      0 0 0 0 0
                      0 0 0 1 0"  result="disp2" />
            <feDisplacementMap
              id="dispB"
              in2="thing2"
              in="preblur"
              scale="-152"
              xChannelSelector="B"
              yChannelSelector="G"
               />
              <feColorMatrix
              type="matrix"
              values="0 0 0 0 0
                      0 0 0 0 0
                      0 0 1 0 0
                      0 0 0 1 0"  result="disp3" />
              <feBlend  in2="disp2" mode="screen"/>
              <feBlend  in2="disp1" mode="screen"/>
              <feGaussianBlur  stdDeviation="0.0" id="postblur" />
              <feBlend  in2="thing0" mode="screen"/>
              <feBlend  in2="thing9" mode="multiply"/>
              <feComposite in2="thing1" operator="in"/>
              <feOffset dx="43" dy="43"/>
          </filter>
        </defs>
        <rect
          x="0"
          y="0"
          width={width}
          height={height}
          rx={radius}
          fill="#fff"
          filter="url(#displacementFilter4)"
        />
      </svg>
      <div
        style={{
          position: "relative",
          zIndex: 1,
          width: "100%",
          height: "100%",
          padding: 24,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
        }}
      >
        {children}
      </div>
    </div>
  );
} 