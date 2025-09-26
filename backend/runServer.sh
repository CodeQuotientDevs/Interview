#!/bin/bash

check_if_server_running() {
    local port=$1
    res=$(curl -Is http://localhost:$port/check | head -n 1)
    if [[ "$res" == *"200 OK"* ]]; then
        return 0
    else
        return 1
    fi
}

pm2 delete 3002
pm2 start src/index.js --name 3002 -- --port 3002

count=0
while [ $count -lt 10 ]; do
    if check_if_server_running 3002; then
        break
    fi

    count=$((count + 1))
    sleep 5
done

if [ $count -eq 10 ]; then
    echo "Server 3002 failed to start after multiple attempts. Exiting."
    exit 1
fi

echo "3002 server started"
echo "starting server 4002"
pm2 delete 4002
pm2 start src/index.js --name 4002 -- --port 4002

pm2 delete worker
pm2 start src/index.js --name worker -- --worker 1

count=0
while [ $count -lt 10 ]; do
    if check_if_server_running 4002; then
        echo "Server 4002 is running successfully."
        exit 0
    fi

    count=$((count + 1))
    sleep 5
done

echo "Server 4002 failed to start. Exiting."
exit 1
