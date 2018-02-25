

/*

Transmit Proccess
1. Recieve an "Initialize Communication:" Message with the exchange key (create shared key)
2. Transmit a "Confirm Communication:" Message with your exchange key
3. Encrypt the File and wait for "Transmit FIle NOW" message
4. Transmit the Encrypted File
5. Transmit a "File Sent, TERMINATE" message
6. Delete the exchange keys = null
7. Delete encrypted file data

*/

/*

Recieve Process
1. Verify file exists via Gun
2. Get comm info from Gun, THEN Transmit an "Initialize Communication:" Message with your exchange key
3. Wait to recieve a (Confirm communication message) with the exchange key (create shared key)
4. Transmit the "Transmit File Now" message
5. Wait for file message
6. wait for "FILE SENT, TERMINATE" message
7. Decrypt file
8. Delete the exchange keys = null
9. RETURN DECRYPTED FILE

*/


/*

Module Initialization:
1. Create a socket listener (DO THIS AT THE TOP OF FILE)
1.5. Defining your functions that are called as a result of the listener recieving data
2. Export functions as a module (DO THIS AT BOTTOM OF FILE)

*/