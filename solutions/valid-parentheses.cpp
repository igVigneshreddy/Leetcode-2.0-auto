#include <string>
#include <stack>
#include <map>

class Solution {
public:
    bool isValid(std::string s) {
        std::stack<char> st;
        std::map<char, char> matching_paren = {
            {')', '('},
            {']', '['},
            {'}', '{'}
        };

        for (char c : s) {
            if (c == '(' || c == '[' || c == '{') {
                st.push(c);
            } else if (c == ')' || c == ']' || c == '}') {
                if (st.empty()) {
                    return false;
#include <string>