#include <vector>
#include <unordered_map>
#include <iostream>
using namespace std;

int main() {
    vector<int> nums(3);
    nums[0] = 1;
    nums[1] = 2;
    nums[2] = 3;
    int k = 3;
    unordered_map<int,int> freq;
    freq[0] = 1;  // empty subarray
    
    int sum = 0, count = 0;
    
    for(int i = 0; i < nums.size(); i++) {
        sum += nums[i];          // prefix sum abhi tak
        
        int need = sum - k;      // ye pehle aaya tha?
        
        if(freq.count(need))
            count += freq[need]; // kitni baar aaya = kitne subarrays
        
        freq[sum]++;             // current prefix store karo
    }
    cout << count;
}