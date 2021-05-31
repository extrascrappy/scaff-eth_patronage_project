import React from "react";
import { PageHeader, Image } from "antd";

// displays a page header

export default function Header() {
  return (
    <div style={{border:"0px solid #cccccc", padding:5, width:250, margin:"left",marginTop:25,marginLeft:25}}>
    <Image
      width={200}
      src="error"
      fallback = "https://i.postimg.cc/T17mRDT8/patronage.png"
    />
    </div>

  );
}
