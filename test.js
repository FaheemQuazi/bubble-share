function getSendSharedFile(fileIdentifier, from) {
    if (LeonsModule.fileExists(fileIdentifier)) {
        var encryptedFile = LalithsModule.encryptFile(x);
        var newFileRecieved = KunalsModule.createPipeAndTransmitFile(encryptedFile, from)
        var decryptedFile = LalithsModule.decryptFile(x);
    }
}