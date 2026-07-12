//go:build !windows && !bindings

package main

import (
	"fmt"
	"net"
	"strconv"
)

const singleInstancePort = 51239

func checkSingleInstance() (func(), error) {
	ln, err := net.Listen("tcp", "127.0.0.1:"+strconv.Itoa(singleInstancePort))
	if err != nil {
		return nil, fmt.Errorf("application instance already running")
	}

	cleanup := func() {
		_ = ln.Close()
	}
	return cleanup, nil
}
