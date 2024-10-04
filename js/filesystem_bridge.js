// Implementor
class OS {
  readFile(path) {}
  writeFile(path, content) {}
}

// ConcreteImplementor
class WindowsOS extends OS {
  readFile(path) {
    console.log(`Reading file from Windows: ${path}`);
  }

  writeFile(path, content) {
    console.log(`Writing file to Windows: ${path} with content: ${content}`);
  }
}

class LinuxOS extends OS {
  readFile(path) {
    console.log(`Reading file from Linux: ${path}`);
  }

  writeFile(path, content) {
    console.log(`Writing file to Linux: ${path} with content: ${content}`);
  }
}

// Abstraction
class FileSystem {
  constructor(os) {
    this.os = os;
  }

  readFile(path) {
    this.os.readFile(path);
  }

  writeFile(path, content) {
    this.os.writeFile(path, content);
  }
}

// RefinedAbstraction
class AdvancedFileSystem extends FileSystem {
  encryptFile(path) {
    console.log(`Encrypting file: ${path}`);
  }
}

// Client code
const windowsFileSystem = new FileSystem(new WindowsOS());
windowsFileSystem.readFile('file.txt');  // Output: Reading file from Windows: file.txt
windowsFileSystem.writeFile('file.txt', 'Hello World');  // Output: Writing file to Windows: file.txt with content: Hello World

const linuxFileSystem = new AdvancedFileSystem(new LinuxOS());
linuxFileSystem.readFile('file.txt');  // Output: Reading file from Linux: file.txt
linuxFileSystem.encryptFile('file.txt');  // Output: Encrypting file: file.txt
