import React from "react";
import logo from "../assets/images/logo.png";

const Loader = () => {
  return (
    <div className="flex items-center justify-center">
      <img
        src={logo}
        alt="LexySign loading"
        className="w-[4rem] h-[4rem] object-contain animate-pulse"
      />
    </div>
  );
};

export default Loader;
