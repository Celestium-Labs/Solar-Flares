import React, { ReactNode, useEffect, useState, useRef } from 'react'
import Link from 'next/link'

import Header from '../components/Header';

type Props = {
  children: ReactNode;
}

export function Layout({ children, ...props }: Props) {

  return <div {...props}>

    <Header />

    <div className="container">
      {children}
    </div>

    <footer>
      <address style={{ textAlign: 'center', paddingBottom: 40 }}>(c) 2022 Celestium Labs all rights reserved</address>
    </footer>

    <div id="loader" style={{ position: 'fixed', bottom: 0, top: 0, left: 0, right: 0, background: 'rgba(0, 0, 0, 0.2)', display: 'none', flexDirection: 'column' }}>
      <div style={{margin: 'auto'}}>
        <svg style={{ background: 'rgba(241, 242, 243, 0)', display: 'block', margin: '0 auto' }} width="200px" height="200px" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid">
          <circle cx="50" cy="50" fill="none" stroke="#FF0079" strokeWidth="2" r="8" strokeDasharray="37.69911184307752 14.566370614359172">
            <animateTransform attributeName="transform" type="rotate" repeatCount="indefinite" dur="1s" values="0 50 50;360 50 50" keyTimes="0;1"></animateTransform>
          </circle>
        </svg>
        <p id="loaderText" style={{textAlign: 'center', fontWeight: '600', fontSize: 18, color: '#FF0079', background: 'rgba(0, 0, 0, 1)', borderRadius: 4}}></p>
      </div>
    </div>

  </div>
}
