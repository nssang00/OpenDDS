#include <iostream>
#include <functional>
#include <string>

// Overload for when the last argument is a callback function
template<typename... Args>
void runJavaScript(const std::string& name, Args... args, const std::function<void(const std::string&)> &resultCallback = nullptr) {
    // Call the function that doesn't take a callback to handle the arguments
    runJavaScript(name, args...);

    // Handle the callback if it was provided
    std::cout << "Callback will be executed after JS function call." << std::endl;

    // Example: Invoke the callback with a mock result
    Variant result = "JS function result";
    if (resultCallback) {
        resultCallback(result);
    }
}

// Example usage
int main() {
    // Example 1: Without callback
    runJavaScript("alert", "Hello, World!");

    // Example 2: With callback
    runJavaScript("fetchData", "param1", "param2", [](const Variant& result) {
        std::cout << "Callback received result: " << result << std::endl;
    });

    return 0;
}
