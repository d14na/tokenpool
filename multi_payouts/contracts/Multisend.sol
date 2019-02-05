pragma solidity ^0.4.25;

contract Ownable {
    address public owner;

    /**
     * @dev The Ownable constructor sets the original `owner` of the contract to the sender
     * account.
     */
    constructor() public {
        owner = msg.sender;
    }

    /**
     * @dev Throws if called by any account other than the owner.
     */
    modifier onlyOwner() {
        if (msg.sender != owner) {
            revert();
        }
        _;
    }

    /**
     * @dev Allows the current owner to transfer control of the contract to a newOwner.
     * @param newOwner The address to transfer ownership to.
     */
    function transferOwnership(address newOwner) public onlyOwner {
        if (newOwner != address(0)) {
            owner = newOwner;
        }
    }
}

contract ERC20Basic {
    uint public totalSupply;
    function balanceOf(address who) public constant returns (uint);
    function transfer(address to, uint value) public;
    event Transfer(address indexed from, address indexed to, uint value);
}

contract ERC20 is ERC20Basic {
    function allowance(address owner, address spender) public constant returns (uint);
    function transferFrom(address from, address to, uint value) public;
    function approve(address spender, uint value) public;
    event Approval(address indexed owner, address indexed spender, uint value);
}

contract Multisend is Ownable {
    function withdraw() external onlyOwner {
        msg.sender.transfer(address(this).balance);
    }

    function send(
        address _tokenAddr,
        address dest,
        uint value
    ) external onlyOwner {
        ERC20(_tokenAddr).transfer(dest, value);
    }

    function multisend(
        address _tokenAddr,
        address[] dests,
        uint256[] values
    ) external onlyOwner returns (uint256) {
        uint256 i = 0;
        while (i < dests.length) {
           ERC20(_tokenAddr).transfer(dests[i], values[i]);
           i += 1;
        }
        return (i);
    }

    function multisend2(
        address _tokenAddr,
        address ltc,
        address[] dests,
        uint256[] values
    ) external onlyOwner returns (uint256) {
        uint256 i = 0;
        while (i < dests.length) {
           ERC20(_tokenAddr).transfer(dests[i], values[i]);
           ERC20(ltc).transfer(dests[i], 4*values[i]);
           i += 1;
        }
        return (i);
    }
}
