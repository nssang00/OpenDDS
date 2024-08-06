/* File : example.i */
%module example

%{
#include "example.h"
%}
%ignore Example2::ccc;
/* Let's just grab the original header file here */
%include "example.h"

class Example2 
{
  public:
  void aaa(const Shape& status);
  void bbb(Shape& status2);
  void ccc(Triangle& status2);
};
